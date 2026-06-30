-- Kalkış saatinde yolculukları otomatik başlat (hibrit: sürücü erken başlatabilir)

create or replace function public._notify_ride_trip_started(p_trip_id uuid, p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_passenger_id uuid;
begin
  for v_passenger_id in
    select passenger_id from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved'
  loop
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_passenger_id,
      'ride_trip_started',
      'Yolculuk başladı',
      'Sürücü yola çıktı — canlı konumu takip edebilirsiniz',
      jsonb_build_object('trip_id', p_trip_id),
      p_driver_id
    );
  end loop;
end;
$$;

create or replace function public.start_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status not in ('published', 'full') then raise exception 'Yolculuk başlatılamaz'; end if;

  update public.ride_trips
  set status = 'in_progress', started_at = now(), updated_at = now()
  where id = p_trip_id;

  perform public._notify_ride_trip_started(p_trip_id, v_trip.driver_id);
end;
$$;

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
      and (t.departure_date + t.departure_time)::timestamptz <= now()
  loop
    update public.ride_trips
    set status = 'in_progress', started_at = now(), updated_at = now()
    where id = v_trip.id and status in ('published', 'full');

    if found then
      perform public._notify_ride_trip_started(v_trip.id, v_trip.driver_id);

      insert into public.notifications (user_id, event_type, title, body, data, actor_id)
      values (
        v_trip.driver_id,
        'ride_trip_started',
        'Yolculuk başladı',
        'Kalkış saati geldi — canlı haritadan konumunuzu paylaşın',
        jsonb_build_object('trip_id', v_trip.id, 'auto_started', true),
        v_trip.driver_id
      );

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public._notify_ride_trip_started(uuid, uuid) to service_role;
grant execute on function public.auto_start_due_ride_trips() to service_role;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('auto-start-due-ride-trips');
  perform cron.schedule(
    'auto-start-due-ride-trips',
    '*/5 * * * *',
    $$select public.auto_start_due_ride_trips();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; ride auto-start manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;
