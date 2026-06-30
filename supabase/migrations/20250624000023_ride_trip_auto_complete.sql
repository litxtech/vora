-- Yolculuk otomatik tamamlama: kalkış + mesafe tabanlı süre + 15 dk tampon

create or replace function public.haversine_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select case
    when lat1 is null or lon1 is null or lat2 is null or lon2 is null then 0::double precision
    else 6371.0 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
    ))
  end;
$$;

create or replace function public.ride_trip_route_distance_km(p_trip_id uuid)
returns double precision
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_stop record;
  v_total double precision := 0;
  v_prev_lat double precision;
  v_prev_lng double precision;
  v_lat double precision;
  v_lng double precision;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id;
  if not found then return 0; end if;

  v_prev_lat := v_trip.from_lat;
  v_prev_lng := v_trip.from_lng;

  for v_stop in
    select latitude, longitude
    from public.ride_trip_stops
    where trip_id = p_trip_id
    order by stop_order asc
  loop
    v_lat := coalesce(v_stop.latitude, v_prev_lat);
    v_lng := coalesce(v_stop.longitude, v_prev_lng);
    if v_prev_lat is not null and v_prev_lng is not null and v_lat is not null and v_lng is not null then
      v_total := v_total + public.haversine_km(v_prev_lat, v_prev_lng, v_lat, v_lng);
    end if;
    v_prev_lat := v_lat;
    v_prev_lng := v_lng;
  end loop;

  v_lat := v_trip.to_lat;
  v_lng := v_trip.to_lng;
  if v_prev_lat is not null and v_prev_lng is not null and v_lat is not null and v_lng is not null then
    v_total := v_total + public.haversine_km(v_prev_lat, v_prev_lng, v_lat, v_lng);
  end if;

  return coalesce(v_total, 0);
end;
$$;

create or replace function public.ride_trip_effective_duration_minutes(p_trip_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_km double precision;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id;
  if not found then return 60; end if;

  if v_trip.estimated_duration_minutes is not null and v_trip.estimated_duration_minutes > 0 then
    return v_trip.estimated_duration_minutes;
  end if;

  v_km := public.ride_trip_route_distance_km(p_trip_id);
  if v_km <= 0 then return 60; end if;

  return greatest(15, round((v_km / 75.0) * 60))::int;
end;
$$;

create or replace function public.ride_trip_auto_complete_deadline(p_trip_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select
    public.ride_trip_departure_istanbul(t.departure_date, t.departure_time)
    + make_interval(mins => public.ride_trip_effective_duration_minutes(t.id) + 15)
  from public.ride_trips t
  where t.id = p_trip_id;
$$;

-- Eski kayıtlar: süre tahmini yoksa mesafeden doldur
update public.ride_trips t
set estimated_duration_minutes = public.ride_trip_effective_duration_minutes(t.id)
where t.estimated_duration_minutes is null
   or t.estimated_duration_minutes <= 0;

create or replace function public.finalize_ride_trip_completion(
  p_trip_id uuid,
  p_driver_id uuid,
  p_auto_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_res record;
  v_due timestamptz := now() + interval '3 days';
  v_passenger_body text;
  v_driver_body text;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> p_driver_id then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  v_passenger_body := case
    when p_auto_completed then 'Tahmini varış süresi doldu — yolculuk otomatik tamamlandı. Deneyiminizi puanlayın.'
    else 'Katkı payınız tahsil edildi. Deneyiminizi puanlayın.'
  end;

  v_driver_body := case
    when p_auto_completed then 'Tahmini süre + 15 dk tampon doldu — yolculuk otomatik sonlandırıldı.'
    else 'Yolculuk başarıyla tamamlandı.'
  end;

  update public.ride_trips
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_trip_id;

  for v_res in
    select id, passenger_id
    from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved' and payment_status = 'held'
  loop
    update public.ride_reservations
    set status = 'completed',
        payment_status = 'released',
        completed_at = now(),
        payout_due_at = v_due,
        updated_at = now()
    where id = v_res.id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id,
      'ride_trip_completed',
      'Yolculuk tamamlandı',
      v_passenger_body,
      jsonb_build_object('trip_id', p_trip_id, 'reservation_id', v_res.id, 'auto_completed', p_auto_completed),
      p_driver_id
    );
  end loop;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_trip_completed',
    'Yolculuk tamamlandı',
    v_driver_body,
    jsonb_build_object('trip_id', p_trip_id, 'auto_completed', p_auto_completed),
    p_driver_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    v_trip.driver_id, 'ride_payout_due', 'Kazanç planlandı',
    'Onaylı yolculuklar tamamlandı — ödeme 3 gün içinde',
    jsonb_build_object('trip_id', p_trip_id),
    p_driver_id
  where exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'completed' and payout_completed_at is null and payment_status = 'released'
  );

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

create or replace function public.ride_trips_due_for_auto_complete(p_limit int default 20)
returns table (id uuid, driver_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.driver_id
  from public.ride_trips t
  where t.status = 'in_progress'
    and public.ride_trip_auto_complete_deadline(t.id) <= now()
  order by public.ride_trip_auto_complete_deadline(t.id) asc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

create or replace function public.dispatch_ride_auto_complete_trips()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_due int;
begin
  select count(*)::int
  into v_due
  from public.ride_trips t
  where t.status = 'in_progress'
    and public.ride_trip_auto_complete_deadline(t.id) <= now();

  if v_due = 0 then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_url is null or v_key is null then
    raise notice 'ride auto-complete: vault secrets missing';
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/ride-auto-complete-trips',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('batch_size', 20)
  );
end;
$$;

grant execute on function public.haversine_km(double precision, double precision, double precision, double precision) to authenticated, anon, service_role;
grant execute on function public.ride_trip_route_distance_km(uuid) to authenticated, anon, service_role;
grant execute on function public.ride_trip_effective_duration_minutes(uuid) to authenticated, anon, service_role;
grant execute on function public.ride_trip_auto_complete_deadline(uuid) to authenticated, anon, service_role;
grant execute on function public.ride_trips_due_for_auto_complete(int) to service_role;
grant execute on function public.finalize_ride_trip_completion(uuid, uuid, boolean) to service_role;
grant execute on function public.dispatch_ride_auto_complete_trips() to service_role;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('ride-auto-complete-trips');
  perform cron.schedule(
    'ride-auto-complete-trips',
    '*/5 * * * *',
    $$select public.dispatch_ride_auto_complete_trips();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; ride auto-complete manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;
