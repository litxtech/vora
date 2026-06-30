-- Reklam: Premium/Kuru kaldırıldı — ön ödemeli cüzdan, sabit 8 kuruş/tıklama

create table if not exists public.ad_wallet_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  lifetime_topup_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  balance_after integer not null,
  entry_type text not null check (
    entry_type in ('topup', 'ad_click', 'admin_adjustment', 'refund')
  ),
  ad_id uuid references public.business_ads (id) on delete set null,
  stripe_checkout_session_id text,
  note text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint ad_wallet_ledger_amount_nonzero check (amount_cents <> 0)
);

create index if not exists ad_wallet_ledger_user_created_idx
  on public.ad_wallet_ledger (user_id, created_at desc);

alter table public.ad_wallet_balances enable row level security;
alter table public.ad_wallet_ledger enable row level security;

create policy "ad_wallet_balances_self_read" on public.ad_wallet_balances
  for select to authenticated
  using (user_id = auth.uid());

create policy "ad_wallet_ledger_self_read" on public.ad_wallet_ledger
  for select to authenticated
  using (user_id = auth.uid());

-- Sabit tıklama ücreti: 8 kuruş (0,08 ₺)
create or replace function public.ad_cpc_cents()
returns integer
language sql
immutable
as $$
  select 8;
$$;

create or replace function public.ad_min_budget_cents()
returns integer
language sql
immutable
as $$
  select 1000;
$$;

create or replace function public.ad_min_topup_cents()
returns integer
language sql
immutable
as $$
  select 5000;
$$;

create or replace function public.get_ad_wallet_balance(p_user_id uuid default auth.uid())
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
    (select balance_cents from public.ad_wallet_balances where user_id = p_user_id),
    0
  );
end;
$$;

create or replace function public.get_ad_wallet_summary(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_balance integer := 0;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  if v_user_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  select coalesce(awb.balance_cents, 0)
  into v_balance
  from public.ad_wallet_balances awb
  where awb.user_id = v_user_id;

  return jsonb_build_object(
    'balance_cents', v_balance,
    'cpc_cents', public.ad_cpc_cents(),
    'min_budget_cents', public.ad_min_budget_cents(),
    'min_topup_cents', public.ad_min_topup_cents()
  );
end;
$$;

create or replace function public.adjust_ad_wallet_balance(
  p_user_id uuid,
  p_amount_cents integer,
  p_entry_type text,
  p_ad_id uuid default null,
  p_stripe_session_id text default null,
  p_note text default null,
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
  v_existing integer;
begin
  if p_user_id is null or p_amount_cents = 0 then
    return coalesce(
      (select balance_cents from public.ad_wallet_balances where user_id = p_user_id),
      0
    );
  end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing
    from public.ad_wallet_ledger
    where idempotency_key = p_idempotency_key;

    if found then
      return v_existing;
    end if;
  end if;

  insert into public.ad_wallet_balances (user_id, balance_cents)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance_cents into v_balance
  from public.ad_wallet_balances
  where user_id = p_user_id
  for update;

  v_new_balance := v_balance + p_amount_cents;

  if v_new_balance < 0 then
    raise exception 'Yetersiz reklam bakiyesi';
  end if;

  update public.ad_wallet_balances
  set
    balance_cents = v_new_balance,
    lifetime_topup_cents = lifetime_topup_cents + greatest(p_amount_cents, 0),
    updated_at = now()
  where user_id = p_user_id;

  insert into public.ad_wallet_ledger (
    user_id, amount_cents, balance_after, entry_type,
    ad_id, stripe_checkout_session_id, note, idempotency_key
  )
  values (
    p_user_id, p_amount_cents, v_new_balance, p_entry_type,
    p_ad_id, p_stripe_session_id, p_note, p_idempotency_key
  );

  return v_new_balance;
end;
$$;

create or replace function public.fulfill_ad_wallet_topup(
  p_user_id uuid,
  p_amount_cents integer,
  p_session_id text,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_amount_cents <= 0 or p_session_id is null then
    raise exception 'Geçersiz yükleme';
  end if;

  if p_amount_cents < public.ad_min_topup_cents() then
    raise exception 'Minimum yükleme tutarı karşılanmadı';
  end if;

  return public.adjust_ad_wallet_balance(
    p_user_id,
    p_amount_cents,
    'topup',
    null,
    p_session_id,
    'Reklam cüzdanı yükleme',
    coalesce(p_idempotency_key, 'ad_topup:' || p_session_id)
  );
end;
$$;

-- billing_mode: yalnızca wallet_cpc
alter table public.business_ads
  drop constraint if exists business_ads_billing_mode_check;

update public.business_ads
set billing_mode = 'wallet_cpc',
    cpc_cents = public.ad_cpc_cents()
where billing_mode in ('premium_quota', 'paid_cpc');

alter table public.business_ads
  add constraint business_ads_billing_mode_check
  check (billing_mode in ('wallet_cpc'));

create or replace function public.enforce_premium_ad_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.profile_ad_policy_accepted(new.owner_id) then
    raise exception 'Reklam yayınlamadan önce Reklam Politikamızı okuyup onaylamanız gerekir';
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 and new.target_region_id is not null then
    new.target_region_ids := array[new.target_region_id];
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 then
    new.target_region_id := null;
    new.target_region_ids := '{}';
  end if;

  new.billing_mode := 'wallet_cpc';
  new.cpc_cents := public.ad_cpc_cents();

  if coalesce(new.budget_cents, 0) < public.ad_min_budget_cents() then
    raise exception 'Reklam bütçesi en az % ₺ olmalıdır', (public.ad_min_budget_cents()::numeric / 100);
  end if;

  return new;
end;
$$;

create or replace function public.start_business_ad_session(p_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_balance integer;
  v_remaining integer;
begin
  select * into v_ad
  from public.business_ads
  where id = p_ad_id
  for update;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  v_remaining := greatest(v_ad.budget_cents - v_ad.spent_cents, 0);

  if v_remaining <= 0 then
    raise exception 'Reklam bütçesi tükendi';
  end if;

  v_balance := public.get_ad_wallet_balance(v_ad.owner_id);

  if v_balance < public.ad_cpc_cents() then
    raise exception 'Reklam yayınlamak için cüzdana bakiye yükleyin (tıklama başı % kuruş)', public.ad_cpc_cents();
  end if;

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    'wallet_cpc',
    0,
    now(),
    now() + interval '24 hours'
  );

  update public.business_ads
  set status = 'active'::public.ad_status,
      starts_at = now(),
      ends_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_ad_id;
end;
$$;

create or replace function public.restart_business_ad(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_balance integer;
  v_remaining integer;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  perform public.expire_business_ads();

  select * into v_ad
  from public.business_ads
  where id = p_ad_id
    and owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  if v_ad.status not in ('ended', 'paused') then
    raise exception 'Yalnızca sona ermiş veya duraklatılmış reklamlar yeniden başlatılabilir';
  end if;

  v_remaining := greatest(v_ad.budget_cents - v_ad.spent_cents, 0);

  if v_remaining <= 0 then
    raise exception 'Reklam bütçesi tükendi';
  end if;

  v_balance := public.get_ad_wallet_balance(v_ad.owner_id);

  if v_balance < public.ad_cpc_cents() then
    raise exception 'Yeniden başlatmak için cüzdana bakiye yükleyin';
  end if;

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    'wallet_cpc',
    0,
    now(),
    now() + interval '24 hours'
  );

  update public.business_ads
  set status = 'active'::public.ad_status,
      starts_at = now(),
      ends_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_ad_id;

  return jsonb_build_object(
    'billing_mode', 'wallet_cpc',
    'debt_cents', 0,
    'ends_at', (now() + interval '24 hours')
  );
end;
$$;

create or replace function public.record_ad_click(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_new_spent integer;
  v_cpc integer;
begin
  perform public.expire_business_ads();

  select * into v_ad
  from public.business_ads
  where id = p_ad_id
    and status = 'active'
    and (ends_at is null or ends_at > now())
  for update;

  if not found then
    raise exception 'Aktif reklam bulunamadı';
  end if;

  v_cpc := public.ad_cpc_cents();

  if v_ad.spent_cents + v_cpc > v_ad.budget_cents then
    update public.business_ads
    set status = 'paused'::public.ad_status,
        updated_at = now()
    where id = p_ad_id;

    raise exception 'Reklam bütçesi tükendi';
  end if;

  begin
    perform public.adjust_ad_wallet_balance(
      v_ad.owner_id,
      -v_cpc,
      'ad_click',
      v_ad.id,
      null,
      'Reklam tıklama ücreti',
      'ad_click:' || p_ad_id::text || ':' || gen_random_uuid()::text
    );
  exception
    when others then
      update public.business_ads
      set status = 'paused'::public.ad_status,
          updated_at = now()
      where id = p_ad_id;
      raise;
  end;

  update public.business_ads
  set clicks = clicks + 1,
      spent_cents = spent_cents + v_cpc,
      status = case
        when spent_cents + v_cpc >= budget_cents then 'paused'::public.ad_status
        else status
      end,
      updated_at = now()
  where id = p_ad_id
  returning spent_cents into v_new_spent;

  return jsonb_build_object(
    'clicks', v_ad.clicks + 1,
    'spent_cents', v_new_spent,
    'billing_mode', 'wallet_cpc',
    'cpc_cents', v_cpc
  );
end;
$$;

-- Oturum tablosu: wallet_cpc
alter table public.business_ad_sessions
  drop constraint if exists business_ad_sessions_billing_mode_check;

alter table public.business_ad_sessions
  add constraint business_ad_sessions_billing_mode_check
  check (billing_mode in ('wallet_cpc', 'premium_quota', 'paid_debt'));

grant execute on function public.ad_cpc_cents() to authenticated;
grant execute on function public.ad_min_budget_cents() to authenticated;
grant execute on function public.ad_min_topup_cents() to authenticated;
grant execute on function public.get_ad_wallet_balance(uuid) to authenticated;
grant execute on function public.get_ad_wallet_summary(uuid) to authenticated;
grant execute on function public.fulfill_ad_wallet_topup(uuid, integer, text, text) to service_role;
