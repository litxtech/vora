-- Keşfet: yayındaki tüm gelecek yolculuklar (full dahil, published_at zorunluluğu yok)

create or replace function public.search_ride_trips(
  p_region_id text default null,
  p_from_city_id text default null,
  p_to_city_id text default null,
  p_departure_date date default null,
  p_min_seats int default 0,
  p_women_only boolean default null,
  p_pets_allowed boolean default null,
  p_no_smoking boolean default null,
  p_max_contribution_cents int default null,
  p_sort text default 'departure',
  p_limit int default 100,
  p_offset int default 0
)
returns setof public.ride_trips
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.expire_past_ride_trips();

  return query
  select t.*
  from public.ride_trips t
  where t.status in ('published', 'full')
    and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time) > now()
    and (coalesce(p_min_seats, 0) <= 0 or t.available_seats >= p_min_seats)
    and (p_region_id is null or t.region_id = p_region_id)
    and (p_from_city_id is null or t.from_city_id = p_from_city_id)
    and (p_to_city_id is null or t.to_city_id = p_to_city_id)
    and (p_departure_date is null or t.departure_date = p_departure_date)
    and (p_women_only is null or t.women_only = p_women_only)
    and (p_pets_allowed is null or t.pets_allowed = p_pets_allowed)
    and (p_no_smoking is null or (p_no_smoking = true and t.smoking_allowed = false))
    and (p_max_contribution_cents is null or t.contribution_cents <= p_max_contribution_cents)
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

-- Eski kayıtlar: yayında/full ama published_at boş
update public.ride_trips
set published_at = coalesce(published_at, updated_at, created_at)
where status in ('published', 'full')
  and published_at is null;
