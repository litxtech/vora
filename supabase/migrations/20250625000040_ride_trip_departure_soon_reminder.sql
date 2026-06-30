-- Sürücü: kalkışa 15 dk kala hazırlık hatırlatması

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
        between now() + interval '12 minutes' and now() + interval '18 minutes'
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
      v_route || ' · Paylaşımlı Yolculuk → Yolculuklarım''dan hazırlanın; kalkışta «Yolculuğu başlat»a dokunun.',
      jsonb_build_object(
        'trip_id', v_trip.id,
        'deep_link', '/detail/rides/' || v_trip.id::text,
        'reminder_kind', 'departure_soon',
        'minutes_before', 15
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
  v_departure_soon int;
  v_departure int;
  v_complete int;
begin
  v_departure_soon := public.process_ride_trip_departure_soon_notifications();
  v_departure := public.process_ride_trip_departure_due_notifications();
  v_complete := public.process_ride_trip_complete_soon_notifications();
  return jsonb_build_object(
    'departure_soon', v_departure_soon,
    'departure_due', v_departure,
    'complete_soon', v_complete
  );
end;
$$;

grant execute on function public.process_ride_trip_departure_soon_notifications() to service_role;

notify pgrst, 'reload schema';
