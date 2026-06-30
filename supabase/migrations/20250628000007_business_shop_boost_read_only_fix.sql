-- Mağaza öne çıkarma: okuma RPC'lerinde UPDATE yapılmasın (read-only transaction hatası)
-- Süresi dolmuş kayıtlar sorguda ends_at ile filtrelenir; status güncellemesi pg_cron ile yapılır.

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
  select count(*)::int into v_count
  from public.business_shop_boosts b
  where b.status = 'active'
    and b.ends_at is not null
    and b.ends_at > now()
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

  perform public.expire_business_shop_boosts();

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

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron extension kullanılamıyor: %', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule(
    'expire-business-shop-boosts',
    '*/15 * * * *',
    $job$select public.expire_business_shop_boosts()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; expire_business_shop_boosts manuel çalıştırılmalı: %', sqlerrm;
end;
$$;
