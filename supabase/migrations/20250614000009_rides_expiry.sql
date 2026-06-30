-- Süresi dolan yolculukları otomatik kapat + listeleme saat dilimi düzeltmesi

-- Eski kayıtlar: yayında ama published_at boş
update public.ride_trips
set published_at = coalesce(published_at, updated_at, created_at)
where status in ('published', 'full')
  and published_at is null;

create or replace function public.ride_trip_departure_at(p_date date, p_time time)
returns timestamp
language sql
immutable
as $$
  select (p_date + p_time)::timestamp;
$$;

create or replace function public.ride_trip_departure_istanbul(p_date date, p_time time)
returns timestamptz
language sql
stable
as $$
  select (public.ride_trip_departure_at(p_date, p_time) AT TIME ZONE 'Europe/Istanbul');
$$;

create or replace function public.expire_past_ride_trips()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_res record;
  v_count int := 0;
begin
  for v_trip in
    select id, driver_id
    from public.ride_trips
    where status in ('published', 'full', 'draft')
      and public.ride_trip_departure_istanbul(departure_date, departure_time) <= now()
  loop
    update public.ride_trips
    set status = 'cancelled',
        cancellation_reason = 'Kalkış zamanı geçti',
        updated_at = now()
    where id = v_trip.id;

    for v_res in
      select *
      from public.ride_reservations
      where trip_id = v_trip.id
        and status in ('pending', 'approved')
    loop
      update public.ride_reservations
      set status = 'cancelled',
          cancelled_at = now(),
          payment_status = case
            when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
            when v_res.payment_status = 'pending' then 'failed'::public.ride_payment_status
            else v_res.payment_status
          end,
          updated_at = now()
      where id = v_res.id;

      insert into public.notifications (user_id, event_type, title, body, data, actor_id)
      values (
        v_res.passenger_id,
        'ride_trip_cancelled',
        'Yolculuk süresi doldu',
        'Kalkış zamanı geçtiği için yolculuk otomatik kapatıldı',
        jsonb_build_object('trip_id', v_trip.id, 'reservation_id', v_res.id),
        v_trip.driver_id
      );
    end loop;

    insert into public.notifications (user_id, event_type, title, body, data)
    values (
      v_trip.driver_id,
      'ride_trip_cancelled',
      'Yolculuk süresi doldu',
      'Kalkış zamanı geçti — ilan listeden kaldırıldı',
      jsonb_build_object('trip_id', v_trip.id)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_past_ride_trips() to authenticated, anon;

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
    and t.published_at is not null
    and t.available_seats >= greatest(coalesce(p_min_seats, 1), 1)
    and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time) > now()
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
  if public.ride_trip_departure_istanbul(v_trip.departure_date, v_trip.departure_time) <= now() then
    raise exception 'Kalkış zamanı geçmiş — tarihi güncelleyin';
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

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('expire-past-ride-trips');
  perform cron.schedule(
    'expire-past-ride-trips',
    '*/10 * * * *',
    $$select public.expire_past_ride_trips();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; expire_past_ride_trips manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;
