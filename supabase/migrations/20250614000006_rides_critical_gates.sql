-- Otomatik Stripe iade altyapısı + ehliyet/koltuk kapıları için ödeme durumu

alter type public.ride_payment_status add value if not exists 'refund_pending' before 'refunded';

-- Yolcu iptali: ödeme held ise refund_pending (Stripe iadesi edge function ile tamamlanır)
create or replace function public.cancel_passenger_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Rezervasyon bulunamadı'; end if;
  if v_res.passenger_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_res.status not in ('pending', 'approved') then raise exception 'Bu rezervasyon iptal edilemez'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.status in ('in_progress', 'completed', 'cancelled') then
    raise exception 'Yolculuk başladı veya tamamlandı — iptal edilemez';
  end if;

  if v_res.status = 'approved' then
    update public.ride_trips
    set available_seats = least(seats_total, available_seats + v_res.seat_count),
        status = case when status = 'full' then 'published'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;
  end if;

  update public.ride_reservations
  set status = 'cancelled',
      cancelled_at = now(),
      payment_status = case
        when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
        else v_res.payment_status
      end,
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_reservation_rejected',
    'Rezervasyon iptal edildi',
    'Yolcu rezervasyonunu iptal etti',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    auth.uid()
  );
end;
$$;

-- Sürücü reddi: held ödemede refund_pending
create or replace function public.respond_ride_reservation(
  p_reservation_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found or v_res.status <> 'pending' then raise exception 'Rezervasyon bulunamadı veya işlenemez'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.driver_id <> auth.uid() and not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  if p_approve then
    if v_res.payment_status <> 'held' then raise exception 'Ödeme henüz tamamlanmadı'; end if;
    if v_res.seat_count > v_trip.available_seats then raise exception 'Yeterli boş koltuk yok'; end if;

    update public.ride_reservations
    set status = 'approved', approved_at = now(), updated_at = now()
    where id = p_reservation_id;

    update public.ride_trips
    set available_seats = available_seats - v_res.seat_count,
        status = case when available_seats - v_res.seat_count <= 0 then 'full'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;

    perform public.ensure_ride_trip_conversation(v_trip.id);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_reservation_approved', 'Rezervasyon onaylandı',
      'Yolculuk rezervasyonunuz onaylandı',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  else
    update public.ride_reservations
    set status = 'rejected',
        payment_status = case
          when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
          else v_res.payment_status
        end,
        updated_at = now()
    where id = p_reservation_id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_reservation_rejected', 'Rezervasyon reddedildi',
      'Yolculuk rezervasyonunuz reddedildi — ödemeniz iade edilecek',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  end if;
end;
$$;

-- Stripe iadesi sonrası (edge function service role ile çağırır)
create or replace function public.finalize_ride_reservation_refund(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Rezervasyon bulunamadı'; end if;

  if v_res.payment_status not in ('held', 'refund_pending') then
    return;
  end if;

  update public.ride_reservations
  set payment_status = 'refunded',
      refunded_at = now(),
      updated_at = now()
  where id = p_reservation_id;
end;
$$;

grant execute on function public.finalize_ride_reservation_refund(uuid) to service_role;
