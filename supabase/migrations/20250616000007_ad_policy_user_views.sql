-- Reklam politikası onayı, tekil gösterim kaydı ve reklam sunumu

create table if not exists public.business_ad_user_views (
  ad_id uuid not null references public.business_ads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  primary key (ad_id, user_id)
);

create index if not exists business_ad_user_views_user_idx
  on public.business_ad_user_views (user_id, first_seen_at desc);

alter table public.business_ad_user_views enable row level security;

create policy "business_ad_user_views_own_read" on public.business_ad_user_views
  for select to authenticated
  using (user_id = auth.uid());

create policy "business_ad_user_views_own_insert" on public.business_ad_user_views
  for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.profile_ad_policy_accepted(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (p.policy_consents->>'ad_policy_accepted_at') is not null
     from public.profiles p
     where p.id = p_user_id),
    false
  );
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
  if not public.profile_ad_policy_accepted(new.owner_id) then
    raise exception 'Reklam yayınlamadan önce Reklam Politikamızı okuyup onaylamanız gerekir';
  end if;

  v_plan := public.resolve_premium_ad_plan(new.owner_id);

  if v_plan is null then
    raise exception 'Reklam yayınlamak için aktif Premium abonelik gerekli';
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 and new.target_region_id is not null then
    new.target_region_ids := array[new.target_region_id];
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 then
    new.target_region_id := null;
    new.target_region_ids := '{}';
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

create or replace function public.record_ad_impression(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  perform public.expire_business_ads();

  insert into public.business_ad_user_views (ad_id, user_id)
  values (p_ad_id, v_user_id)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.business_ads
    set impressions = impressions + 1,
        updated_at = now()
    where id = p_ad_id
      and status = 'active'
      and (ends_at is null or ends_at > now());
  end if;

  return jsonb_build_object('counted', v_inserted > 0);
end;
$$;

create or replace function public.pick_business_ad_for_user(
  p_ad_type public.ad_type,
  p_region_id text default null
)
returns setof public.business_ads
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  perform public.expire_business_ads();

  return query
  select ba.*
  from public.business_ads ba
  where ba.status = 'active'
    and ba.ad_type = p_ad_type
    and (ba.ends_at is null or ba.ends_at > now())
    and ba.owner_id <> v_user_id
    and (
      coalesce(cardinality(ba.target_region_ids), 0) = 0
      or p_region_id is null
      or p_region_id = any (ba.target_region_ids)
      or ba.target_region_id = p_region_id
    )
    and not exists (
      select 1
      from public.business_ad_user_views v
      where v.ad_id = ba.id
        and v.user_id = v_user_id
    )
  order by ba.created_at desc
  limit 1;
end;
$$;

grant execute on function public.record_ad_impression(uuid) to authenticated;
grant execute on function public.pick_business_ad_for_user(public.ad_type, text) to authenticated;
grant execute on function public.profile_ad_policy_accepted(uuid) to authenticated;
