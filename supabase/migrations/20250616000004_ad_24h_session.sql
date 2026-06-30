-- Reklam oturumları: 24 saat yayın, yeniden başlatmada hak veya platform borcu

create table if not exists public.business_ad_sessions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.business_ads (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  billing_mode text not null check (billing_mode in ('premium_quota', 'paid_debt')),
  debt_cents integer not null default 0 check (debt_cents >= 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists business_ad_sessions_owner_month_idx
  on public.business_ad_sessions (owner_id, started_at desc);

create index if not exists business_ad_sessions_ad_idx
  on public.business_ad_sessions (ad_id, started_at desc);

alter table public.business_ad_sessions enable row level security;

create policy "business_ad_sessions_owner_read" on public.business_ad_sessions
  for select to authenticated
  using (owner_id = auth.uid());

alter table public.platform_debt_ledger
  drop constraint if exists platform_debt_ledger_entry_type_check;

alter table public.platform_debt_ledger
  add constraint platform_debt_ledger_entry_type_check
  check (entry_type in ('ad_click', 'manual_adjustment', 'payment', 'ad_session'));

create or replace function public.ad_session_debt_cents()
returns integer
language sql
immutable
as $$
  select 5000;
$$;

create or replace function public.premium_ad_quota_used(p_user_id uuid, p_month_start timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.business_ad_sessions bas
  where bas.owner_id = p_user_id
    and bas.billing_mode = 'premium_quota'
    and bas.started_at >= p_month_start;
$$;

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

  v_plan := public.resolve_premium_ad_plan(v_user_id);

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

  v_used := public.premium_ad_quota_used(v_user_id, v_month_start);

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
  v_plan := public.resolve_premium_ad_plan(new.owner_id);

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

    v_used := public.premium_ad_quota_used(new.owner_id, v_month_start);

    if v_used >= v_limit then
      raise exception 'Ücretsiz reklam hakkınız bitti. Ücretli reklam modunu kullanın.';
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

create or replace function public.expire_business_ads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.business_ads
  set status = 'ended'::public.ad_status,
      updated_at = now()
  where status in ('active', 'paused')
    and ends_at is not null
    and ends_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
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
  v_plan text;
  v_limit integer;
  v_used integer;
  v_month_start timestamptz;
  v_session_billing text;
  v_debt integer := 0;
begin
  select * into v_ad
  from public.business_ads
  where id = p_ad_id
  for update;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  v_plan := public.resolve_premium_ad_plan(v_ad.owner_id);
  if v_plan is null then
    raise exception 'Premium abonelik gerekli';
  end if;

  v_limit := public.premium_ad_monthly_limit(v_plan);
  v_month_start := date_trunc(
    'month',
    timezone('Europe/Istanbul', now())
  ) at time zone 'Europe/Istanbul';

  v_used := public.premium_ad_quota_used(v_ad.owner_id, v_month_start);

  if v_ad.billing_mode = 'premium_quota' and v_used < v_limit then
    v_session_billing := 'premium_quota';
    v_debt := 0;
  else
    v_session_billing := 'paid_debt';
    v_debt := public.ad_session_debt_cents();
  end if;

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    v_session_billing,
    v_debt,
    now(),
    now() + interval '24 hours'
  );

  if v_session_billing = 'paid_debt' and v_debt > 0 then
    update public.profiles
    set platform_debt_cents = coalesce(platform_debt_cents, 0) + v_debt
    where id = v_ad.owner_id;

    insert into public.platform_debt_ledger (user_id, ad_id, amount_cents, entry_type, note)
    values (v_ad.owner_id, v_ad.id, v_debt, 'ad_session', '24 saatlik reklam oturumu');
  end if;

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
  v_plan text;
  v_limit integer;
  v_used integer;
  v_month_start timestamptz;
  v_session_billing text;
  v_debt integer := 0;
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

  v_plan := public.resolve_premium_ad_plan(v_ad.owner_id);
  if v_plan is null then
    raise exception 'Premium abonelik gerekli';
  end if;

  v_limit := public.premium_ad_monthly_limit(v_plan);
  v_month_start := date_trunc(
    'month',
    timezone('Europe/Istanbul', now())
  ) at time zone 'Europe/Istanbul';

  v_used := public.premium_ad_quota_used(v_ad.owner_id, v_month_start);

  if v_used < v_limit then
    v_session_billing := 'premium_quota';
    v_debt := 0;
  else
    v_session_billing := 'paid_debt';
    v_debt := public.ad_session_debt_cents();
  end if;

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    v_session_billing,
    v_debt,
    now(),
    now() + interval '24 hours'
  );

  if v_session_billing = 'paid_debt' and v_debt > 0 then
    update public.profiles
    set platform_debt_cents = coalesce(platform_debt_cents, 0) + v_debt
    where id = v_ad.owner_id;

    insert into public.platform_debt_ledger (user_id, ad_id, amount_cents, entry_type, note)
    values (v_ad.owner_id, v_ad.id, v_debt, 'ad_session', 'Reklam yeniden başlatma — 24 saat');
  end if;

  update public.business_ads
  set status = 'active'::public.ad_status,
      starts_at = now(),
      ends_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_ad_id;

  return jsonb_build_object(
    'billing_mode', v_session_billing,
    'debt_cents', v_debt,
    'ends_at', (now() + interval '24 hours')
  );
end;
$$;

create or replace function public.admin_review_business_ad(
  p_ad_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_approve then
    perform public.start_business_ad_session(p_ad_id);
  else
    update public.business_ads
    set status = 'ended'::public.ad_status,
        updated_at = now()
    where id = p_ad_id;
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    auth.uid(),
    'business_ad',
    p_ad_id,
    (case when p_approve then 'warn' else 'remove' end)::public.moderation_action_type,
    coalesce(p_note, case when p_approve then 'Reklam onaylandı — 24 saat yayın' else 'Reklam reddedildi' end)
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

grant execute on function public.expire_business_ads() to authenticated;
grant execute on function public.restart_business_ad(uuid) to authenticated;
grant execute on function public.ad_session_debt_cents() to authenticated;
grant execute on function public.admin_review_business_ad(uuid, boolean, text) to authenticated;
