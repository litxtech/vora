-- Reklam CPC borçlandırma, çoklu şehir hedefleme, platform borcu

alter table public.profiles
  add column if not exists platform_debt_cents integer not null default 0,
  add column if not exists ad_stripe_payment_method_id text;

alter table public.business_ads
  add column if not exists billing_mode text not null default 'premium_quota'
    check (billing_mode in ('premium_quota', 'paid_cpc')),
  add column if not exists cpc_cents integer not null default 0,
  add column if not exists target_region_ids text[] not null default '{}';

update public.business_ads
set target_region_ids = array[target_region_id]
where target_region_id is not null
  and (target_region_ids is null or cardinality(target_region_ids) = 0);

create table if not exists public.platform_debt_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ad_id uuid references public.business_ads (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  entry_type text not null check (entry_type in ('ad_click', 'manual_adjustment', 'payment')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists platform_debt_ledger_user_idx
  on public.platform_debt_ledger (user_id, created_at desc);

alter table public.platform_debt_ledger enable row level security;

create policy "platform_debt_ledger_self_read" on public.platform_debt_ledger
  for select to authenticated
  using (user_id = auth.uid());

-- Kotayı yalnızca premium_quota reklamları tüketir
create or replace function public.get_premium_ad_quota(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_plan text;
  v_limit integer := 0;
  v_used integer := 0;
  v_month_start timestamptz;
  v_debt integer := 0;
  v_has_card boolean := false;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  select coalesce(p.platform_debt_cents, 0),
         (p.ad_stripe_payment_method_id is not null and length(trim(p.ad_stripe_payment_method_id)) > 0)
  into v_debt, v_has_card
  from public.profiles p
  where p.id = v_user_id;

  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = v_user_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  if v_plan is null then
    return jsonb_build_object(
      'is_premium', false,
      'plan', null,
      'monthly_limit', 0,
      'used_this_month', 0,
      'remaining', 0,
      'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY'),
      'platform_debt_cents', v_debt,
      'has_card_on_file', v_has_card
    );
  end if;

  v_limit := public.premium_ad_monthly_limit(v_plan);
  v_month_start := date_trunc(
    'month',
    timezone('Europe/Istanbul', now())
  ) at time zone 'Europe/Istanbul';

  select count(*)::int
  into v_used
  from public.business_ads ba
  where ba.owner_id = v_user_id
    and ba.billing_mode = 'premium_quota'
    and ba.created_at >= v_month_start;

  return jsonb_build_object(
    'is_premium', true,
    'plan', v_plan,
    'monthly_limit', v_limit,
    'used_this_month', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY'),
    'platform_debt_cents', v_debt,
    'has_card_on_file', v_has_card
  );
end;
$$;

create or replace function public.enforce_premium_ad_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_month_start timestamptz;
begin
  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = new.owner_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  if v_plan is null then
    raise exception 'Reklam yayınlamak için aktif Premium abonelik gerekli';
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 and new.target_region_id is not null then
    new.target_region_ids := array[new.target_region_id];
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 then
    raise exception 'En az bir hedef şehir seçmelisiniz';
  end if;

  if new.billing_mode = 'premium_quota' then
    v_limit := public.premium_ad_monthly_limit(v_plan);
    v_month_start := date_trunc(
      'month',
      timezone('Europe/Istanbul', now())
    ) at time zone 'Europe/Istanbul';

    select count(*)::int
    into v_used
    from public.business_ads ba
    where ba.owner_id = new.owner_id
      and ba.billing_mode = 'premium_quota'
      and ba.created_at >= v_month_start;

    if v_used >= v_limit then
      raise exception 'Ücretsiz reklam hakkınız bitti. Ücretli (tıklama başı) reklam modunu kullanın.';
    end if;

    new.cpc_cents := 0;
    return new;
  end if;

  if new.billing_mode = 'paid_cpc' then
    if coalesce(new.cpc_cents, 0) < 100 then
      raise exception 'Tıklama başı minimum ücret 1 ₺ olmalıdır';
    end if;
    if coalesce(new.budget_cents, 0) < 10000 then
      raise exception 'Ücretli reklam için minimum bütçe 100 ₺ olmalıdır';
    end if;
    return new;
  end if;

  raise exception 'Geçersiz reklam faturalama modu';
end;
$$;

create or replace function public.fulfill_ad_card_setup(
  p_user_id uuid,
  p_payment_method_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_payment_method_id is null or length(trim(p_payment_method_id)) = 0 then
    raise exception 'Geçersiz kart bilgisi';
  end if;

  update public.profiles
  set ad_stripe_payment_method_id = trim(p_payment_method_id)
  where id = p_user_id;
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
begin
  select * into v_ad
  from public.business_ads
  where id = p_ad_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Aktif reklam bulunamadı';
  end if;

  update public.business_ads
  set clicks = clicks + 1,
      spent_cents = spent_cents + case when billing_mode = 'paid_cpc' then cpc_cents else 0 end,
      status = case
        when billing_mode = 'paid_cpc' and spent_cents + cpc_cents >= budget_cents then 'paused'::public.ad_status
        else status
      end,
      updated_at = now()
  where id = p_ad_id
  returning spent_cents into v_new_spent;

  if v_ad.billing_mode = 'paid_cpc' and v_ad.cpc_cents > 0 then
    update public.profiles
    set platform_debt_cents = coalesce(platform_debt_cents, 0) + v_ad.cpc_cents
    where id = v_ad.owner_id;

    insert into public.platform_debt_ledger (user_id, ad_id, amount_cents, entry_type, note)
    values (v_ad.owner_id, v_ad.id, v_ad.cpc_cents, 'ad_click', 'Reklam tıklama ücreti');
  end if;

  return jsonb_build_object(
    'clicks', v_ad.clicks + 1,
    'spent_cents', v_new_spent,
    'billing_mode', v_ad.billing_mode
  );
end;
$$;

create or replace function public.admin_list_platform_debts(p_limit integer default 50)
returns table (
  user_id uuid,
  username text,
  full_name text,
  platform_debt_cents integer,
  has_card_on_file boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    coalesce(p.platform_debt_cents, 0),
    (p.ad_stripe_payment_method_id is not null and length(trim(p.ad_stripe_payment_method_id)) > 0),
    p.updated_at
  from public.profiles p
  where coalesce(p.platform_debt_cents, 0) > 0
  order by p.platform_debt_cents desc
  limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.get_premium_ad_quota(uuid) to authenticated;
grant execute on function public.fulfill_ad_card_setup(uuid, text) to service_role;
grant execute on function public.record_ad_click(uuid) to authenticated;
grant execute on function public.admin_list_platform_debts(integer) to authenticated;
