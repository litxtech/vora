-- Yolculuk bildirimleri: zengin payload, push outbox, doğru deep link

create or replace function public._ride_trip_notification_payload(
  p_trip_id uuid,
  p_extra jsonb default '{}'::jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    jsonb_build_object(
      'trip_id', t.id,
      'deep_link', '/detail/rides/' || t.id::text,
      'from_city_id', t.from_city_id,
      'to_city_id', t.to_city_id,
      'route_label', public._ride_trip_route_label(t.from_city_id, t.to_city_id)
    ) || coalesce(p_extra, '{}'::jsonb)
  from public.ride_trips t
  where t.id = p_trip_id;
$$;

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
      v_route || ' · Paylaşımlı Yolculuk → Yolculuklarım''dan «Yolculuğu başlat».',
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'reminder_kind', 'departure_due',
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
      v_route || ' · «Yolculuğu tamamla» — kazancınız cüzdana yansır.',
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'reminder_kind', 'complete_soon',
        'action_hint', 'Yolculuğu tamamla',
        'section_label', 'Yolculuk detayı',
        'estimated_arrival_at', v_arrival
      )),
      v_trip.driver_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

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

create or replace function public.admin_mark_ride_payout(
  p_reservation_id uuid,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  if not public.is_moderator() then return jsonb_build_object('error', 'Yetkisiz'); end if;

  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return jsonb_build_object('error', 'Rezervasyon bulunamadı'); end if;
  if v_res.status <> 'completed' or v_res.payment_status <> 'released' then
    return jsonb_build_object('error', 'Ödeme bu aşamada yapılamaz');
  end if;
  if v_res.payout_completed_at is not null then return jsonb_build_object('error', 'Zaten ödendi'); end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;

  update public.ride_reservations
  set payout_completed_at = now(),
      payout_reference = nullif(trim(p_reference), ''),
      payout_completed_by = auth.uid(),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
  values (
    'rides_commission'::public.revenue_type,
    v_res.commission_cents / 100.0,
    'TRY',
    v_res.id,
    v_trip.from_city_id || '→' || v_trip.to_city_id,
    'Paylaşımlı yolculuk %10 komisyon'
  );

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_payout_completed',
    'Kazanç yatırıldı',
    public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id)
      || ' · ₺' || trim(to_char(v_res.driver_payout_cents / 100.0, 'FM999999990.00'))
      || ' cüzdanınıza yansıdı.',
    public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
      'reservation_id', p_reservation_id,
      'amount_label', '₺' || trim(to_char(v_res.driver_payout_cents / 100.0, 'FM999999990.00')),
      'action_hint', 'Cüzdanı aç',
      'section_label', 'Cüzdan → TRY kazançları',
      'deep_link', '/wallet'
    )),
    null
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public._ride_trip_notification_payload(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
