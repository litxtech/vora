-- Yolculuk rezervasyonu: yolcu bilgi formu + kart kaydı + şoför onayında tahsilat

alter table public.ride_reservations
  add column if not exists passenger_first_name text,
  add column if not exists passenger_last_name text,
  add column if not exists passenger_age smallint,
  add column if not exists passenger_gender public.gender_type;

alter table public.ride_reservations
  drop constraint if exists ride_reservations_passenger_age_check;

alter table public.ride_reservations
  add constraint ride_reservations_passenger_age_check
  check (passenger_age is null or (passenger_age >= 18 and passenger_age <= 99));

drop function if exists public.request_ride_reservation(uuid, int, text, uuid);

create or replace function public.request_ride_reservation(
  p_trip_id uuid,
  p_seat_count int,
  p_passenger_note text default null,
  p_pickup_stop_id uuid default null,
  p_passenger_first_name text default null,
  p_passenger_last_name text default null,
  p_passenger_age smallint default null,
  p_passenger_gender public.gender_type default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_amount int;
  v_commission int;
  v_payout int;
  v_reservation_id uuid;
  v_first text := nullif(trim(coalesce(p_passenger_first_name, '')), '');
  v_last text := nullif(trim(coalesce(p_passenger_last_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if v_first is null then
    raise exception 'Yolcu adı gerekli';
  end if;
  if v_last is null then
    raise exception 'Yolcu soyadı gerekli';
  end if;
  if p_passenger_age is null or p_passenger_age < 18 or p_passenger_age > 99 then
    raise exception 'Geçerli bir yaş girin (18-99)';
  end if;
  if p_passenger_gender is null then
    raise exception 'Cinsiyet seçimi gerekli';
  end if;

  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then
    raise exception 'Yolculuk bulunamadı';
  end if;
  if v_trip.status not in ('published', 'full') then
    raise exception 'Bu yolculuk rezervasyona kapalı';
  end if;
  if v_trip.driver_id = auth.uid() then
    raise exception 'Kendi yolculuğunuza rezervasyon yapamazsınız';
  end if;
  if p_seat_count < 1 or p_seat_count > v_trip.available_seats then
    raise exception 'Yeterli boş koltuk yok';
  end if;

  if v_trip.women_only and p_passenger_gender is distinct from 'female' then
    raise exception 'Bu yolculuk yalnızca kadın yolcular içindir';
  end if;

  if exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id
      and passenger_id = auth.uid()
      and status in ('pending', 'approved')
  ) then
    raise exception 'Bu yolculuk için zaten aktif bir rezervasyonunuz var';
  end if;

  v_amount := v_trip.contribution_cents * p_seat_count;
  v_commission := round(v_amount * 0.10);
  v_payout := v_amount - v_commission;

  insert into public.ride_reservations (
    trip_id, passenger_id, seat_count, amount_cents, commission_cents, driver_payout_cents,
    passenger_note, pickup_stop_id, payment_status,
    passenger_first_name, passenger_last_name, passenger_age, passenger_gender
  )
  values (
    p_trip_id, auth.uid(), p_seat_count, v_amount, v_commission, v_payout,
    nullif(trim(coalesce(p_passenger_note, '')), ''), p_pickup_stop_id, 'pending',
    v_first, v_last, p_passenger_age, p_passenger_gender
  )
  returning id into v_reservation_id;

  return v_reservation_id;
exception
  when unique_violation then
    raise exception 'Bu yolculuk için zaten aktif bir rezervasyonunuz var';
end;
$$;

grant execute on function public.request_ride_reservation(
  uuid, int, text, uuid, text, text, smallint, public.gender_type
) to authenticated;

-- Kart kaydı bildirimi: ücret şoför onayında
create or replace function public.fulfill_ride_reservation_card(
  p_reservation_id uuid,
  p_passenger_id uuid,
  p_session_id text,
  p_setup_intent_id text,
  p_payment_method_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
  v_guest text;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return null; end if;
  if v_res.passenger_id <> p_passenger_id then return null; end if;
  if v_res.payment_status not in ('pending') then return null; end if;
  if v_res.status not in ('pending', 'cancelled') then
    if v_res.status = 'cancelled' then
      update public.ride_reservations set status = 'pending' where id = p_reservation_id;
    else
      return null;
    end if;
  end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;
  if v_trip.status not in ('published', 'full') then return null; end if;

  update public.ride_reservations
  set payment_status = 'card_saved',
      stripe_checkout_session_id = p_session_id,
      stripe_setup_intent_id = p_setup_intent_id,
      stripe_payment_method_id = p_payment_method_id,
      updated_at = now()
  where id = p_reservation_id;

  v_guest := trim(coalesce(v_res.passenger_first_name, '') || ' ' || coalesce(v_res.passenger_last_name, ''));

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_reservation_new',
    'Yeni rezervasyon talebi',
    v_res.seat_count || ' koltuk · kart kaydedildi — onaylayın'
      || case when v_guest <> '' then ' · ' || v_guest else '' end,
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    p_passenger_id
  );

  perform public.notify_ride_user(
    p_passenger_id,
    'ride_reservation_paid',
    'Kartınız kaydedildi',
    'Rezervasyonunuz şoför onayını bekliyor. Katkı payı onay anında tahsil edilir; red durumunda ücret çekilmez.',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    v_trip.driver_id
  );

  return p_reservation_id;
end;
$$;

-- Onay bildirimi: tahsil edildiyse tutarı belirt
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
  v_amount_label text;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found or v_res.status <> 'pending' then raise exception 'Rezervasyon bulunamadı veya işlenemez'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.driver_id <> auth.uid() and not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  if p_approve then
    if v_res.payment_status not in ('held', 'card_saved') then
      raise exception 'Kart kaydı veya ödeme henüz tamamlanmadı';
    end if;
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

    v_amount_label := '₺' || trim(to_char(v_res.amount_cents / 100.0, 'FM999999990.00'));

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_reservation_approved',
      'Rezervasyon onaylandı',
      case
        when v_res.payment_status = 'held' then
          v_amount_label || ' katkı payı tahsil edildi. Yolculuk rezervasyonunuz onaylandı.'
        else 'Yolculuk rezervasyonunuz onaylandı'
      end,
      jsonb_build_object(
        'trip_id', v_trip.id,
        'reservation_id', p_reservation_id,
        'amount_cents', v_res.amount_cents
      ),
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

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_reservation_rejected',
      'Rezervasyon reddedildi',
      case
        when v_res.payment_status = 'held' then 'Yolculuk rezervasyonunuz reddedildi — ödemeniz iade edilecek'
        else 'Yolculuk rezervasyonunuz reddedildi — kartınızdan ücret çekilmedi'
      end,
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  end if;
end;
$$;

create or replace function public.mark_ride_reservation_charge_failed(
  p_reservation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
begin
  select * into v_res from public.ride_reservations where id = p_reservation_id;
  if not found then return; end if;

  update public.ride_reservations
  set payment_status = 'failed',
      updated_at = now()
  where id = p_reservation_id;

  perform public.notify_ride_user(
    v_res.passenger_id,
    'ride_reservation_paid',
    'Ödeme alınamadı',
    coalesce(
      nullif(trim(p_reason), ''),
      'Şoför onayı sonrası karttan tahsilat başarısız. Lütfen kartınızı güncelleyip tekrar deneyin.'
    ),
    jsonb_build_object('trip_id', v_res.trip_id, 'reservation_id', p_reservation_id),
    null
  );
end;
$$;
