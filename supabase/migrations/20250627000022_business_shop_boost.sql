-- Mağaza öne çıkarma — sabit süreli vitrin paketleri (Stripe ödeme sonrası aktif)

create type public.business_shop_boost_tier as enum ('starter', 'standard', 'premium');
create type public.business_shop_boost_scope as enum ('region', 'karadeniz');
create type public.business_shop_boost_status as enum ('pending', 'active', 'ended', 'cancelled');

create table public.business_shop_boosts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  package_tier public.business_shop_boost_tier not null,
  region_scope public.business_shop_boost_scope not null default 'region',
  region_id text references public.regions (id),
  showcase_snapshot jsonb not null default '[]'::jsonb,
  list_price_cents integer not null check (list_price_cents > 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  price_cents integer not null check (price_cents > 0),
  duration_days integer not null check (duration_days > 0),
  impressions integer not null default 0,
  shop_views integer not null default 0,
  status public.business_shop_boost_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  discovery_featured_id uuid references public.discovery_featured_items (id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_shop_boost_region_scope_check check (
    (region_scope = 'region' and region_id is not null)
    or (region_scope = 'karadeniz' and region_id is null)
  )
);

create index business_shop_boosts_business_idx
  on public.business_shop_boosts (business_id, created_at desc);

create index business_shop_boosts_active_idx
  on public.business_shop_boosts (status, region_scope, region_id, ends_at desc)
  where status = 'active';

create index business_shop_boosts_pending_session_idx
  on public.business_shop_boosts (stripe_checkout_session_id)
  where status = 'pending';

create trigger business_shop_boosts_updated_at
  before update on public.business_shop_boosts
  for each row execute function public.set_updated_at();

alter table public.business_shop_boosts enable row level security;

create policy business_shop_boosts_owner_select on public.business_shop_boosts
  for select to authenticated
  using (owner_id = auth.uid());

comment on table public.business_shop_boosts is
  'İşletme mağazası sabit süreli öne çıkarma paketleri — ödeme sonrası keşfet ve mağazalar vitrininde görünür';

-- Paket tanımları (kuruş)
create or replace function public.shop_boost_list_price_cents(
  p_tier public.business_shop_boost_tier,
  p_scope public.business_shop_boost_scope
)
returns integer
language sql
immutable
as $$
  select case
    when p_tier = 'starter' and p_scope = 'region' then 14900
    when p_tier = 'starter' and p_scope = 'karadeniz' then 24900
    when p_tier = 'standard' and p_scope = 'region' then 29900
    when p_tier = 'standard' and p_scope = 'karadeniz' then 44900
    when p_tier = 'premium' and p_scope = 'region' then 49900
    when p_tier = 'premium' and p_scope = 'karadeniz' then 74900
    else 29900
  end;
$$;

create or replace function public.shop_boost_duration_days(p_tier public.business_shop_boost_tier)
returns integer
language sql
immutable
as $$
  select case
    when p_tier = 'starter' then 3
    when p_tier = 'standard' then 7
    when p_tier = 'premium' then 14
    else 7
  end;
$$;

create or replace function public.shop_boost_priority(p_tier public.business_shop_boost_tier)
returns integer
language sql
immutable
as $$
  select case
    when p_tier = 'starter' then 20
    when p_tier = 'standard' then 50
    when p_tier = 'premium' then 100
    else 50
  end;
$$;

create or replace function public.shop_boost_slot_region_key(
  p_scope public.business_shop_boost_scope,
  p_region_id text
)
returns text
language sql
immutable
as $$
  select case
    when p_scope = 'karadeniz' then '__all__'
    else coalesce(p_region_id, 'trabzon')
  end;
$$;

create or replace function public.shop_boost_max_slots()
returns integer
language sql
immutable
as $$
  select 3;
$$;

create or replace function public.expire_business_shop_boosts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_shop_boosts
  set status = 'ended', updated_at = now()
  where status = 'active'
    and ends_at is not null
    and ends_at <= now();
end;
$$;

create or replace function public.count_active_shop_boost_slots(p_region_key text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.expire_business_shop_boosts();

  select count(*)::int into v_count
  from public.business_shop_boosts b
  where b.status = 'active'
    and (
      (b.region_scope = 'karadeniz' and p_region_key = '__all__')
      or (
        b.region_scope = 'region'
        and public.shop_boost_slot_region_key(b.region_scope, b.region_id) = p_region_key
      )
    );

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.shop_boost_slots_available(
  p_scope public.business_shop_boost_scope,
  p_region_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := public.shop_boost_slot_region_key(p_scope, p_region_id);
  v_used integer;
  v_max integer := public.shop_boost_max_slots();
begin
  v_used := public.count_active_shop_boost_slots(v_key);
  return jsonb_build_object(
    'region_key', v_key,
    'used', v_used,
    'max', v_max,
    'available', greatest(0, v_max - v_used)
  );
end;
$$;

create or replace function public.fulfill_business_shop_boost(
  p_boost_id uuid,
  p_session_id text,
  p_payment_intent_id text default null,
  p_amount_cents integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boost public.business_shop_boosts%rowtype;
  v_business public.businesses%rowtype;
  v_featured_id uuid;
  v_region_key text;
  v_discovery_scope text;
  v_slots integer;
  v_max integer := public.shop_boost_max_slots();
begin
  if p_boost_id is null or p_session_id is null then
    raise exception 'Geçersiz ödeme kaydı';
  end if;

  select * into v_boost
  from public.business_shop_boosts
  where id = p_boost_id
    and stripe_checkout_session_id = p_session_id
  for update;

  if not found then
    raise exception 'Öne çıkarma kaydı bulunamadı';
  end if;

  if v_boost.status = 'active' then
    return v_boost.id;
  end if;

  if v_boost.status <> 'pending' then
    raise exception 'Bu öne çıkarma kaydı ödenemez';
  end if;

  select * into v_business
  from public.businesses
  where id = v_boost.business_id;

  if not found or v_business.registration_status <> 'approved' then
    raise exception 'İşletme onaylı değil';
  end if;

  v_region_key := public.shop_boost_slot_region_key(v_boost.region_scope, v_boost.region_id);
  v_slots := public.count_active_shop_boost_slots(v_region_key);

  if v_slots >= v_max then
    raise exception 'Bu bölgede öne çıkarma slotları dolu. Lütfen daha sonra tekrar deneyin.';
  end if;

  v_discovery_scope := case
    when v_boost.region_scope = 'karadeniz' then 'karadeniz'
    else 'region'
  end;

  update public.business_shop_boosts
  set
    status = 'active',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    price_cents = case when p_amount_cents > 0 then p_amount_cents else price_cents end,
    starts_at = now(),
    ends_at = now() + (v_boost.duration_days || ' days')::interval,
    paid_at = now(),
    updated_at = now()
  where id = v_boost.id
  returning * into v_boost;

  insert into public.discovery_featured_items (
    tab,
    target_type,
    target_id,
    region_key,
    scope,
    priority,
    featured_until,
    featured_by
  )
  values (
    'businesses',
    'business',
    v_boost.business_id,
    v_region_key,
    v_discovery_scope,
    public.shop_boost_priority(v_boost.package_tier),
    v_boost.ends_at,
    v_boost.owner_id
  )
  on conflict (tab, target_id, region_key, scope)
  do update set
    priority = excluded.priority,
    featured_until = excluded.featured_until,
    featured_by = excluded.featured_by
  returning id into v_featured_id;

  update public.business_shop_boosts
  set discovery_featured_id = v_featured_id
  where id = v_boost.id;

  insert into public.revenue_records (
    revenue_type,
    amount,
    currency,
    reference_id,
    reference_label,
    region_id,
    notes
  )
  values (
    'advertisement',
    (v_boost.price_cents::numeric / 100),
    'TRY',
    v_boost.id,
    coalesce(v_business.name, 'Mağaza öne çıkarma'),
    coalesce(v_boost.region_id, v_business.region_id),
    'Mağaza öne çıkarma — ' || v_boost.package_tier::text
  );

  return v_boost.id;
end;
$$;

create or replace function public.get_active_business_shop_boosts(
  p_region_id text default 'trabzon',
  p_limit int default 6
)
returns table (
  boost_id uuid,
  business_id uuid,
  package_tier public.business_shop_boost_tier,
  region_scope public.business_shop_boost_scope,
  ends_at timestamptz,
  showcase_snapshot jsonb,
  business_name text,
  business_category text,
  logo_url text,
  cover_url text,
  shop_tagline text,
  shop_accent text,
  commerce_mode public.business_commerce_mode,
  is_verified boolean,
  district text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.expire_business_shop_boosts();

  return query
  select
    b.id,
    b.business_id,
    b.package_tier,
    b.region_scope,
    b.ends_at,
    b.showcase_snapshot,
    biz.name,
    biz.category,
    biz.logo_url,
    biz.cover_url,
    biz.shop_tagline,
    biz.shop_accent,
    biz.commerce_mode,
    biz.is_verified,
    biz.district
  from public.business_shop_boosts b
  join public.businesses biz on biz.id = b.business_id
  where b.status = 'active'
    and b.ends_at > now()
    and biz.registration_status = 'approved'
    and biz.shop_published = true
    and biz.commerce_mode <> 'none'
    and (
      b.region_scope = 'karadeniz'
      or b.region_id = p_region_id
    )
  order by public.shop_boost_priority(b.package_tier) desc, b.starts_at desc
  limit greatest(1, least(p_limit, 12));
end;
$$;

create or replace function public.get_business_shop_boost_status(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_boost public.business_shop_boosts%rowtype;
begin
  if auth.uid() is not null then
    if not exists (
      select 1 from public.businesses b
      where b.id = p_business_id and b.owner_id = auth.uid()
    ) then
      return jsonb_build_object('active', false);
    end if;
  end if;

  perform public.expire_business_shop_boosts();

  select * into v_boost
  from public.business_shop_boosts
  where business_id = p_business_id
    and status = 'active'
    and ends_at > now()
  order by ends_at desc
  limit 1;

  if not found then
    return jsonb_build_object('active', false);
  end if;

  return jsonb_build_object(
    'active', true,
    'boost_id', v_boost.id,
    'package_tier', v_boost.package_tier,
    'region_scope', v_boost.region_scope,
    'starts_at', v_boost.starts_at,
    'ends_at', v_boost.ends_at,
    'impressions', v_boost.impressions,
    'shop_views', v_boost.shop_views
  );
end;
$$;

create or replace function public.record_shop_boost_impression(p_boost_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_shop_boosts
  set impressions = impressions + 1
  where id = p_boost_id
    and status = 'active';
end;
$$;

create or replace function public.record_shop_boost_shop_view(p_boost_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_shop_boosts
  set shop_views = shop_views + 1
  where id = p_boost_id
    and status = 'active';
end;
$$;

grant usage on type public.business_shop_boost_tier to authenticated;
grant usage on type public.business_shop_boost_scope to authenticated;
grant usage on type public.business_shop_boost_status to authenticated;

grant select on public.business_shop_boosts to authenticated;
grant execute on function public.shop_boost_slots_available(public.business_shop_boost_scope, text) to authenticated;
grant execute on function public.get_active_business_shop_boosts(text, int) to anon, authenticated;
grant execute on function public.get_business_shop_boost_status(uuid) to authenticated;
grant execute on function public.record_shop_boost_impression(uuid) to anon, authenticated;
grant execute on function public.record_shop_boost_shop_view(uuid) to anon, authenticated;
grant execute on function public.fulfill_business_shop_boost(uuid, text, text, integer) to service_role;
