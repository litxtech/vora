-- Paylaşımlı yolculuk listesi: diğer kullanıcılara görünürlük + sunucu tarafı yayınlama

create or replace function public.get_ride_listing_driver_profiles(p_driver_ids uuid[])
returns table (
  id uuid,
  full_name text,
  username text,
  is_verified boolean,
  avatar_url text,
  account_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.is_verified,
    p.avatar_url,
    p.account_status::text
  from public.profiles p
  where p.id = any(p_driver_ids);
$$;

grant execute on function public.get_ride_listing_driver_profiles(uuid[]) to authenticated, anon;

drop policy if exists ride_vehicles_read on public.ride_vehicles;
create policy ride_vehicles_read on public.ride_vehicles for select using (
  user_id = auth.uid()
  or public.is_moderator()
  or (verification_status = 'approved' and is_active = true)
  or exists (
    select 1 from public.ride_trips t
    where t.vehicle_id = ride_vehicles.id
      and t.status in ('published', 'full', 'in_progress')
  )
);

create or replace function public.publish_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then
    raise exception 'Yolculuk bulunamadı';
  end if;
  if v_trip.driver_id <> auth.uid() then
    raise exception 'Yetkisiz';
  end if;
  if v_trip.status not in ('draft', 'published', 'full') then
    raise exception 'Bu yolculuk yayınlanamaz';
  end if;
  if v_trip.vehicle_id is null then
    raise exception 'Araç seçilmedi';
  end if;

  if not exists (
    select 1 from public.ride_vehicles v
    where v.id = v_trip.vehicle_id
      and v.user_id = auth.uid()
      and v.verification_status = 'approved'
      and v.is_active = true
  ) then
    raise exception 'Yayınlamak için admin onaylı bir aracınız olmalı';
  end if;

  if not exists (
    select 1 from public.ride_license_verifications l
    where l.user_id = auth.uid()
      and l.status = 'approved'
  ) then
    raise exception 'Yayınlamak için doğrulanmış ehliyetiniz olmalı';
  end if;

  update public.ride_trips
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = p_trip_id;
end;
$$;

grant execute on function public.publish_ride_trip(uuid) to authenticated;

create or replace function public.search_ride_trips(
  p_region_id text default null,
  p_from_city_id text default null,
  p_to_city_id text default null,
  p_departure_date date default null,
  p_min_seats int default 1,
  p_women_only boolean default null,
  p_pets_allowed boolean default null,
  p_no_smoking boolean default null,
  p_max_contribution_cents int default null,
  p_sort text default 'departure',
  p_limit int default 30,
  p_offset int default 0
)
returns setof public.ride_trips
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select t.*
  from public.ride_trips t
  where t.status in ('published', 'full')
    and t.published_at is not null
    and t.available_seats >= greatest(coalesce(p_min_seats, 1), 1)
    and (p_region_id is null or t.region_id = p_region_id)
    and (p_from_city_id is null or t.from_city_id = p_from_city_id)
    and (p_to_city_id is null or t.to_city_id = p_to_city_id)
    and (p_departure_date is null or t.departure_date = p_departure_date)
    and (p_women_only is null or t.women_only = p_women_only)
    and (p_pets_allowed is null or t.pets_allowed = p_pets_allowed)
    and (p_no_smoking is null or (p_no_smoking = true and t.smoking_allowed = false))
    and (p_max_contribution_cents is null or t.contribution_cents <= p_max_contribution_cents)
    and t.departure_date >= current_date
  order by
    case when p_sort = 'contribution_asc' then t.contribution_cents end asc,
    case when p_sort = 'contribution_desc' then t.contribution_cents end desc,
    case when p_sort = 'seats' then t.available_seats end asc,
    t.departure_date asc,
    t.departure_time asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;
