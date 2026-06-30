-- finalize_ride_trip_completion: eski 2 parametreli overload PostgREST/RPC çakışması yaratıyordu

drop function if exists public.finalize_ride_trip_completion(uuid, uuid);

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

create or replace function public.complete_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_has_card_only boolean;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  select exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved' and payment_status = 'card_saved'
  ) into v_has_card_only;

  if v_has_card_only then
    raise exception 'Bu yolculuk için önce uygulama üzerinden tamamlama ve tahsilat gerekir';
  end if;

  perform public.finalize_ride_trip_completion(p_trip_id, auth.uid(), false);
end;
$$;

grant execute on function public.finalize_ride_trip_completion(uuid, uuid, boolean) to service_role;
grant execute on function public.complete_ride_trip(uuid) to authenticated;

notify pgrst, 'reload schema';
