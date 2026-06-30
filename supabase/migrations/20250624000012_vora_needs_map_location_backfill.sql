-- Konumsuz ihtiyaç ilanlarına bölge merkezi ata (harita pin'i için)

create or replace function public.region_center_lng(p_region_id text)
returns double precision
language sql
immutable
as $$
  select case p_region_id
    when 'amasya' then 35.8353
    when 'artvin' then 41.8183
    when 'bartin' then 32.3375
    when 'bayburt' then 40.2249
    when 'bolu' then 31.6061
    when 'corum' then 34.9556
    when 'duzce' then 31.1565
    when 'giresun' then 38.3895
    when 'gumushane' then 39.4814
    when 'karabuk' then 32.6204
    when 'kastamonu' then 33.7827
    when 'ordu' then 37.8764
    when 'rize' then 40.5234
    when 'samsun' then 36.33
    when 'sinop' then 35.1551
    when 'tokat' then 36.55
    when 'trabzon' then 39.7178
    when 'zonguldak' then 31.7987
    else 39.7178
  end;
$$;

create or replace function public.region_center_lat(p_region_id text)
returns double precision
language sql
immutable
as $$
  select case p_region_id
    when 'amasya' then 40.6499
    when 'artvin' then 41.1828
    when 'bartin' then 41.6344
    when 'bayburt' then 40.2552
    when 'bolu' then 40.7356
    when 'corum' then 40.5506
    when 'duzce' then 40.8438
    when 'giresun' then 40.9128
    when 'gumushane' then 40.4603
    when 'karabuk' then 41.2061
    when 'kastamonu' then 41.3887
    when 'ordu' then 40.9839
    when 'rize' then 41.0201
    when 'samsun' then 41.2867
    when 'sinop' then 42.0267
    when 'tokat' then 40.3167
    when 'trabzon' then 41.0015
    when 'zonguldak' then 41.4564
    else 41.0015
  end;
$$;

update public.vora_needs n
set
  location = st_setsrid(
    st_makepoint(
      public.region_center_lng(n.region_id),
      public.region_center_lat(n.region_id)
    ),
    4326
  )::geography,
  updated_at = now()
where n.location is null
  and n.region_id is not null
  and n.status = 'active'
  and n.content_status = 'published';
