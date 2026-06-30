-- Kuru — uygulama içi para birimi (ledger + admin panel)

create type public.kuru_transaction_type as enum (
  'task_reward',
  'admin_credit',
  'admin_debit',
  'spend',
  'bonus',
  'transfer_in',
  'transfer_out'
);

create type public.kuru_source_type as enum (
  'daily_task',
  'admin',
  'profile_boost',
  'deal_redeem',
  'tip',
  'signup_bonus',
  'other'
);

create table public.user_kuru_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  lifetime_spent integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.kuru_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  balance_after integer not null,
  tx_type public.kuru_transaction_type not null,
  source_type public.kuru_source_type not null default 'other',
  source_key text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint kuru_transactions_amount_nonzero check (amount <> 0)
);

create index kuru_transactions_user_created_idx
  on public.kuru_transactions (user_id, created_at desc);

create index kuru_transactions_created_idx
  on public.kuru_transactions (created_at desc);

-- Bakiye ayarla (atomik, idempotent)
create or replace function public.adjust_kuru_balance(
  p_user_id uuid,
  p_amount integer,
  p_tx_type public.kuru_transaction_type,
  p_source_type public.kuru_source_type default 'other',
  p_source_key text default null,
  p_reference_id uuid default null,
  p_note text default null,
  p_created_by uuid default null,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new_balance integer;
  v_existing_balance integer;
begin
  if p_user_id is null or p_amount = 0 then
    return coalesce(
      (select balance from public.user_kuru_balances where user_id = p_user_id),
      0
    );
  end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing_balance
    from public.kuru_transactions
    where idempotency_key = p_idempotency_key;

    if found then
      return v_existing_balance;
    end if;
  end if;

  insert into public.user_kuru_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_kuru_balances
  where user_id = p_user_id
  for update;

  v_new_balance := v_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'Yetersiz Kuru bakiyesi';
  end if;

  update public.user_kuru_balances
  set
    balance = v_new_balance,
    lifetime_earned = lifetime_earned + greatest(p_amount, 0),
    lifetime_spent = lifetime_spent + greatest(-p_amount, 0),
    updated_at = now()
  where user_id = p_user_id;

  insert into public.kuru_transactions (
    user_id, amount, balance_after, tx_type, source_type,
    source_key, reference_id, note, created_by, idempotency_key
  )
  values (
    p_user_id, p_amount, v_new_balance, p_tx_type, p_source_type,
    p_source_key, p_reference_id, p_note, p_created_by, p_idempotency_key
  );

  return v_new_balance;
end;
$$;

create or replace function public.get_user_kuru_balance(p_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_user_id is null then
    return 0;
  end if;

  if p_user_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  return coalesce(
    (select balance from public.user_kuru_balances where user_id = p_user_id),
    0
  );
end;
$$;

create or replace function public.get_user_kuru_summary(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_row public.user_kuru_balances%rowtype;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'balance', 0,
      'lifetime_earned', 0,
      'lifetime_spent', 0
    );
  end if;

  if p_user_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  select * into v_row
  from public.user_kuru_balances
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object(
      'balance', 0,
      'lifetime_earned', 0,
      'lifetime_spent', 0
    );
  end if;

  return jsonb_build_object(
    'balance', v_row.balance,
    'lifetime_earned', v_row.lifetime_earned,
    'lifetime_spent', v_row.lifetime_spent,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.get_user_kuru_transactions(
  p_user_id uuid default auth.uid(),
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  amount integer,
  balance_after integer,
  tx_type public.kuru_transaction_type,
  source_type public.kuru_source_type,
  source_key text,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if p_user_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  return query
  select
    t.id,
    t.amount,
    t.balance_after,
    t.tx_type,
    t.source_type,
    t.source_key,
    t.note,
    t.created_at
  from public.kuru_transactions t
  where t.user_id = p_user_id
  order by t.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
end;
$$;

-- Günlük görev ödüllerini Kuru'ya taşı (görev tabloları varsa)
do $$
begin
  if to_regclass('public.daily_task_definitions') is not null then
    update public.daily_task_definitions
    set reward_type = 'kuru'::public.task_reward_type
    where reward_type = 'points'::public.task_reward_type;
  end if;
end $$;

-- Ödül talep et (auth + kuru desteği) — görev sistemi yüklüyse
do $outer$
begin
  if to_regclass('public.daily_task_definitions') is null then
    return;
  end if;

  execute $claim$
create or replace function public.claim_daily_task_reward(
  p_user_id uuid,
  p_task_key text,
  p_task_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_daily_task_progress%rowtype;
  v_def public.daily_task_definitions%rowtype;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Yetkisiz erişim';
  end if;

  select * into v_row
  from public.user_daily_task_progress
  where user_id = p_user_id and task_key = p_task_key and task_date = p_task_date;

  if not found or v_row.completed_at is null or v_row.claimed_at is not null then
    raise exception 'Ödül talep edilemez';
  end if;

  select * into v_def from public.daily_task_definitions where key = p_task_key;

  update public.user_daily_task_progress
  set claimed_at = now()
  where user_id = p_user_id and task_key = p_task_key and task_date = p_task_date;

  case v_def.reward_type
    when 'points' then
      perform public.adjust_contribution_score(p_user_id, v_def.reward_value);
      perform public.adjust_trust_score(p_user_id, greatest(1, v_def.reward_value / 3));
    when 'kuru' then
      perform public.adjust_kuru_balance(
        p_user_id,
        v_def.reward_value,
        'task_reward',
        'daily_task',
        p_task_key,
        null,
        v_def.title,
        null,
        'task:' || p_user_id::text || ':' || p_task_key || ':' || p_task_date::text
      );
      perform public.adjust_trust_score(p_user_id, greatest(1, v_def.reward_value / 5));
    when 'badge' then
      if v_def.reward_key is not null then
        insert into public.user_badges (user_id, badge_type)
        values (p_user_id, v_def.reward_key::public.badge_type)
        on conflict do nothing;
      end if;
    when 'achievement' then
      if v_def.reward_key is not null then
        perform public.award_achievement(p_user_id, v_def.reward_key);
      end if;
    when 'premium_days' then
      insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
      values (
        p_user_id,
        'monthly',
        'active',
        now(),
        now() + (v_def.reward_value || ' days')::interval
      );
      perform public.sync_premium_status(p_user_id);
  end case;

  if (
    select count(*) = (select count(*) from public.daily_task_definitions where is_active = true)
    from public.user_daily_task_progress p
    where p.user_id = p_user_id
      and p.task_date = p_task_date
      and p.claimed_at is not null
  ) then
    perform public.award_achievement(p_user_id, 'daily_tasks_complete');
    insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
    values (p_user_id, 'monthly', 'active', now(), now() + interval '1 day');
    perform public.sync_premium_status(p_user_id);
    perform public.adjust_kuru_balance(
      p_user_id,
      25,
      'bonus',
      'daily_task',
      'daily_tasks_complete',
      null,
      'Tüm günlük görevler bonusu',
      null,
      'bonus:all_tasks:' || p_user_id::text || ':' || p_task_date::text
    );
  end if;

  return jsonb_build_object(
    'task_key', p_task_key,
    'reward_type', v_def.reward_type,
    'reward_value', v_def.reward_value
  );
end;
$$;
$claim$;
end $outer$;

-- Admin: ekonomi özeti
create or replace function public.admin_kuru_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_total_balance bigint;
  v_holders bigint;
  v_credits_today bigint;
  v_debits_today bigint;
  v_tx_today bigint;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  select coalesce(sum(balance), 0), count(*)
  into v_total_balance, v_holders
  from public.user_kuru_balances
  where balance > 0;

  select
    coalesce(sum(case when amount > 0 then amount else 0 end), 0),
    coalesce(sum(case when amount < 0 then -amount else 0 end), 0),
    count(*)
  into v_credits_today, v_debits_today, v_tx_today
  from public.kuru_transactions
  where created_at >= date_trunc('day', now());

  return jsonb_build_object(
    'total_balance', v_total_balance,
    'holders_count', v_holders,
    'credits_today', v_credits_today,
    'debits_today', v_debits_today,
    'transactions_today', v_tx_today
  );
end;
$$;

-- Admin: bakiye düzenle
create or replace function public.admin_adjust_kuru(
  p_user_id uuid,
  p_amount integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_tx_type public.kuru_transaction_type;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  if p_user_id is null or p_amount = 0 then
    raise exception 'Geçersiz tutar';
  end if;

  v_tx_type := case when p_amount > 0 then 'admin_credit' else 'admin_debit' end;

  v_balance := public.adjust_kuru_balance(
    p_user_id,
    p_amount,
    v_tx_type,
    'admin',
    null,
    null,
    coalesce(nullif(trim(p_note), ''), 'Admin düzenlemesi'),
    auth.uid(),
    'admin:' || auth.uid()::text || ':' || p_user_id::text || ':' || extract(epoch from now())::bigint::text
  );

  return jsonb_build_object(
    'user_id', p_user_id,
    'amount', p_amount,
    'balance', v_balance
  );
end;
$$;

-- Admin: işlem listesi
create or replace function public.admin_list_kuru_transactions(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  amount integer,
  balance_after integer,
  tx_type public.kuru_transaction_type,
  source_type public.kuru_source_type,
  source_key text,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  return query
  select
    t.id,
    t.user_id,
    p.username,
    t.amount,
    t.balance_after,
    t.tx_type,
    t.source_type,
    t.source_key,
    t.note,
    t.created_at
  from public.kuru_transactions t
  join public.profiles p on p.id = t.user_id
  order by t.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
end;
$$;

-- Admin: kullanıcı kuru özeti
create or replace function public.admin_get_user_kuru(p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_summary jsonb;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  v_summary := public.get_user_kuru_summary(p_user_id);

  return v_summary || jsonb_build_object(
    'recent_transactions', coalesce(
      (
        select jsonb_agg(row_to_json(r))
        from (
          select id, amount, balance_after, tx_type, source_type, source_key, note, created_at
          from public.kuru_transactions
          where user_id = p_user_id
          order by created_at desc
          limit 10
        ) r
      ),
      '[]'::jsonb
    )
  );
end;
$$;

alter table public.user_kuru_balances enable row level security;
alter table public.kuru_transactions enable row level security;

create policy "user_kuru_balances_self_read" on public.user_kuru_balances
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy "kuru_transactions_self_read" on public.kuru_transactions
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

grant execute on function public.adjust_kuru_balance(uuid, integer, public.kuru_transaction_type, public.kuru_source_type, text, uuid, text, uuid, text) to authenticated;
grant execute on function public.get_user_kuru_balance(uuid) to authenticated;
grant execute on function public.get_user_kuru_summary(uuid) to authenticated;
grant execute on function public.get_user_kuru_transactions(uuid, integer, integer) to authenticated;
grant execute on function public.admin_kuru_stats() to authenticated;
grant execute on function public.admin_adjust_kuru(uuid, integer, text) to authenticated;
grant execute on function public.admin_list_kuru_transactions(integer, integer) to authenticated;
grant execute on function public.admin_get_user_kuru(uuid) to authenticated;

insert into public.app_feature_flags (feature_id, label, feature_group)
values ('kuru', 'Kuru Cüzdan', 'programs')
on conflict (feature_id) do nothing;
