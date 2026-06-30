-- Yolculuk hatırlatmaları: pg_cron işleri güvenli şekilde kaydet + daha geniş eşleşme penceresi
-- (önceki migration'larda cron.unschedule hata verince schedule hiç çalışmıyordu)

create or replace function public.process_ride_trip_departure_soon_notifications()
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
        between now() + interval '8 minutes' and now() + interval '22 minutes'
  loop
    if exists (
      select 1
      from public.notifications n
      where n.user_id = v_trip.driver_id
        and n.event_type = 'ride_trip_departure_soon'
        and n.data->>'trip_id' = v_trip.id::text
        and n.created_at > v_trip.departure_at - interval '3 hours'
    ) then
      continue;
    end if;

    v_route := public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id);

    perform public.notify_ride_user(
      v_trip.driver_id,
      'ride_trip_departure_soon',
      'Kalkışa 15 dakika',
      v_route || ' · Paylaşımlı Yolculuk → Yolculuklarım''dan «Yolculuğu başlat».',
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'reminder_kind', 'departure_soon',
        'action_hint', 'Yolculuğu başlat',
        'section_label', 'Paylaşımlı Yolculuk → Yolculuklarım'
      )),
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

    if v_arrival < now() + interval '20 minutes' or v_arrival > now() + interval '40 minutes' then
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
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'reminder_kind', 'complete_soon',
        'action_hint', 'Yolculuğu tamamla',
        'estimated_arrival_at', v_arrival
      )),
      v_trip.driver_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron extension kullanılamıyor: %', sqlerrm;
end;
$cron$;

do $cron$
begin
  begin
    perform cron.unschedule('process-ride-trip-driver-reminders');
  exception when others then
    null;
  end;
  perform cron.schedule(
    'process-ride-trip-driver-reminders',
    '*/5 * * * *',
    $$select public.process_ride_trip_driver_reminders();$$
  );
exception when others then
  raise notice 'process-ride-trip-driver-reminders cron kaydı başarısız: %', sqlerrm;
end;
$cron$;

do $cron$
begin
  begin
    perform cron.unschedule('auto-start-due-ride-trips');
  exception when others then
    null;
  end;
  perform cron.schedule(
    'auto-start-due-ride-trips',
    '*/5 * * * *',
    $$select public.auto_start_due_ride_trips();$$
  );
exception when others then
  raise notice 'auto-start-due-ride-trips cron kaydı başarısız: %', sqlerrm;
end;
$cron$;

do $cron$
begin
  begin
    perform cron.unschedule('ride-auto-complete-trips');
  exception when others then
    null;
  end;
  perform cron.schedule(
    'ride-auto-complete-trips',
    '*/5 * * * *',
    $$select public.dispatch_ride_auto_complete_trips();$$
  );
exception when others then
  raise notice 'ride-auto-complete-trips cron kaydı başarısız: %', sqlerrm;
end;
$cron$;

notify pgrst, 'reload schema';
