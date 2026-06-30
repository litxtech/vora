-- Yolculuk başlat / bitir: inbox + push (notification_outbox üzerinden)

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
    perform public.notify_ride_user(
      v_passenger_id,
      'ride_trip_started',
      'Yolculuk başladı',
      'Sürücü yola çıktı — canlı konumu takip edebilirsiniz',
      public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
        'action_hint', 'Canlı konumu aç',
        'section_label', 'Yolculuk detayı'
      )),
      p_driver_id
    );
  end loop;
end;
$$;

-- finalize_ride_trip_completion: doğrudan insert yerine notify_ride_user (push outbox)
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
  v_route text;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> p_driver_id then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  v_route := public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id);

  v_passenger_body := case
    when p_auto_completed then v_route || ' · Tahmini varış süresi doldu — deneyiminizi puanlayın.'
    else v_route || ' · Katkı payınız tahsil edildi — deneyiminizi puanlayın.'
  end;

  v_driver_body := case
    when p_auto_completed then v_route || ' · Tahmini süre doldu — kazancınız cüzdana yansıyacak.'
    else v_route || ' · Yolculuk tamamlandı — kazancınız cüzdana yansıyacak.'
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

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_trip_completed',
      'Yolculuk tamamlandı',
      v_passenger_body,
      public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
        'reservation_id', v_res.id,
        'auto_completed', p_auto_completed,
        'action_hint', 'Yolculuğu değerlendir',
        'section_label', 'Yolculuk detayı'
      )),
      p_driver_id
    );
  end loop;

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_trip_completed',
    'Yolculuk tamamlandı',
    v_driver_body,
    public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
      'auto_completed', p_auto_completed,
      'action_hint', 'Cüzdanı aç',
      'section_label', 'Cüzdan → TRY kazançları',
      'deep_link', '/wallet'
    )),
    p_driver_id
  );

  if exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'completed' and payout_completed_at is null and payment_status = 'released'
  ) then
    perform public.notify_ride_user(
      v_trip.driver_id,
      'ride_payout_due',
      'Kazanç planlandı',
      v_route || ' · 3 gün içinde cüzdana yansır.',
      public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
        'action_hint', 'Cüzdanı aç',
        'section_label', 'Cüzdan → TRY kazançları',
        'deep_link', '/wallet'
      )),
      p_driver_id
    );
  end if;

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

grant execute on function public._notify_ride_trip_started(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
