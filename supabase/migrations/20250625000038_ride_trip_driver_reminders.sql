-- Sürücü hatırlatmaları: kalkış saatinde başlat, tahmini varışa yaklaşınca bitir

create or replace function public.ride_trip_estimated_arrival(p_trip_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select
    public.ride_trip_departure_istanbul(t.departure_date, t.departure_time)
    + make_interval(mins => public.ride_trip_effective_duration_minutes(t.id))
  from public.ride_trips t
  where t.id = p_trip_id;
$$;

create or replace function public._ride_trip_route_label(p_from_city_id text, p_to_city_id text)
returns text
language sql
immutable
as $$
  select trim(coalesce(p_from_city_id, '?')) || ' → ' || trim(coalesce(p_to_city_id, '?'));
$$;

create or replace function public.process_ride_trip_departure_due_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_count int := 0;
  v_route text;
begin
  for v_trip in
    select
      t.id,
      t.driver_id,
      t.from_city_id,
      t.to_city_id,
      public.ride_trip_departure_istanbul(t.departure_date, t.departure_time) as departure_at
    from public.ride_trips t
    where t.status in ('published', 'full')
      and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time)
        between now() - interval '12 minutes' and now()
  loop
    if exists (
      select 1
      from public.notifications n
      where n.user_id = v_trip.driver_id
        and n.event_type = 'ride_trip_departure_due'
        and n.data->>'trip_id' = v_trip.id::text
        and n.created_at > v_trip.departure_at - interval '2 hours'
    ) then
      continue;
    end if;

    v_route := public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id);

    perform public.notify_ride_user(
      v_trip.driver_id,
      'ride_trip_departure_due',
      'Kalkış saati geldi',
      v_route || ' · Paylaşımlı Yolculuk → Yolculuklarım bölümünden «Yolculuğu başlat»a dokunun.',
      jsonb_build_object(
        'trip_id', v_trip.id,
        'deep_link', '/detail/rides/' || v_trip.id::text,
        'reminder_kind', 'departure_due'
      ),
      v_trip.driver_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.process_ride_trip_complete_soon_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_count int := 0;
  v_route text;
  v_arrival timestamptz;
begin
  for v_trip in
    select t.id, t.driver_id, t.from_city_id, t.to_city_id
    from public.ride_trips t
    where t.status = 'in_progress'
  loop
    v_arrival := public.ride_trip_estimated_arrival(v_trip.id);
    if v_arrival is null then
      continue;
    end if;

    if v_arrival < now() + interval '25 minutes' or v_arrival > now() + interval '35 minutes' then
      continue;
    end if;

    if exists (
      select 1
      from public.notifications n
      where n.user_id = v_trip.driver_id
        and n.event_type = 'ride_trip_complete_soon'
        and n.data->>'trip_id' = v_trip.id::text
        and n.created_at > now() - interval '6 hours'
    ) then
      continue;
    end if;

    v_route := public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id);

    perform public.notify_ride_user(
      v_trip.driver_id,
      'ride_trip_complete_soon',
      'Yolculuk bitişine az kaldı',
      v_route || ' · Yolculuk detayından «Yolculuğu tamamla» — kazancınız cüzdana yansır.',
      jsonb_build_object(
        'trip_id', v_trip.id,
        'deep_link', '/detail/rides/' || v_trip.id::text,
        'reminder_kind', 'complete_soon',
        'estimated_arrival_at', v_arrival
      ),
      v_trip.driver_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.process_ride_trip_driver_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departure int;
  v_complete int;
begin
  v_departure := public.process_ride_trip_departure_due_notifications();
  v_complete := public.process_ride_trip_complete_soon_notifications();
  return jsonb_build_object(
    'departure_due', v_departure,
    'complete_soon', v_complete
  );
end;
$$;

-- Sürücüye manuel başlatma şansı: otomatik başlatma 20 dk sonra devreye girer
create or replace function public.auto_start_due_ride_trips()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_count int := 0;
begin
  for v_trip in
    select t.id, t.driver_id
    from public.ride_trips t
    where t.status in ('published', 'full')
      and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time)
        <= now() - interval '20 minutes'
  loop
    update public.ride_trips
    set status = 'in_progress', started_at = now(), updated_at = now()
    where id = v_trip.id and status in ('published', 'full');

    if found then
      perform public._notify_ride_trip_started(v_trip.id, v_trip.driver_id);

      perform public.notify_ride_user(
        v_trip.driver_id,
        'ride_trip_started',
        'Yolculuk otomatik başlatıldı',
        'Kalkıştan 20 dk geçti — canlı konum paylaşımını açmayı unutmayın.',
        jsonb_build_object(
          'trip_id', v_trip.id,
          'deep_link', '/detail/rides/' || v_trip.id::text,
          'auto_started', true
        ),
        v_trip.driver_id
      );

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.ride_trip_estimated_arrival(uuid) to authenticated, anon, service_role;
grant execute on function public.process_ride_trip_departure_due_notifications() to service_role;
grant execute on function public.process_ride_trip_complete_soon_notifications() to service_role;
grant execute on function public.process_ride_trip_driver_reminders() to service_role;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-ride-trip-driver-reminders');
  perform cron.schedule(
    'process-ride-trip-driver-reminders',
    '*/5 * * * *',
    $$select public.process_ride_trip_driver_reminders();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; ride driver reminders manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;

notify pgrst, 'reload schema';
