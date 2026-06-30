-- Otel: oda doluluk, video, ödeme fişi işletmeye iletimi

alter table public.hotel_listings
  add column if not exists total_rooms smallint not null default 1,
  add column if not exists occupied_rooms smallint not null default 0,
  add column if not exists video_urls text[] not null default '{}';

alter table public.hotel_listings
  drop constraint if exists hotel_listings_occupancy_check;

alter table public.hotel_listings
  add constraint hotel_listings_occupancy_check
  check (total_rooms >= 1 and occupied_rooms >= 0 and occupied_rooms <= total_rooms);

alter table public.hotel_reservations
  add column if not exists owner_receipt_sent_at timestamptz;

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
where id = 'hotel-listings';

create or replace function public.create_hotel_reservation_pending(
  p_hotel_id uuid,
  p_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count smallint,
  p_apply_student_discount boolean,
  p_guest_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel public.hotel_listings%rowtype;
  v_nights int;
  v_nightly_cents int;
  v_discount_pct smallint;
  v_gross int;
  v_commission int;
  v_net int;
  v_res_id uuid;
  v_code text;
  v_available int;
begin
  if p_guest_id is distinct from auth.uid() then
    raise exception 'Unauthorized';
  end if;

  select * into v_hotel
  from public.hotel_listings
  where id = p_hotel_id and status = 'published'
  for update;

  if not found then
    raise exception 'Otel bulunamadı veya yayında değil';
  end if;

  if v_hotel.owner_id = p_guest_id then
    raise exception 'Kendi otelinize rezervasyon yapamazsınız';
  end if;

  v_available := coalesce(v_hotel.total_rooms, 1) - coalesce(v_hotel.occupied_rooms, 0);
  if v_available < 1 then
    raise exception 'Müsait oda bulunmuyor';
  end if;

  v_nights := (p_check_out - p_check_in);
  if v_nights < 1 then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  v_nightly_cents := v_hotel.price_per_night * 100;
  v_discount_pct := case when p_apply_student_discount and v_hotel.student_discount_pct > 0
    then v_hotel.student_discount_pct else 0 end;

  v_gross := round(v_nightly_cents * v_nights * (1 - v_discount_pct::numeric / 100))::int;
  if v_gross < 100 then
    raise exception 'Minimum rezervasyon tutarı geçersiz';
  end if;

  v_commission := round(v_gross * 0.12)::int;
  v_net := v_gross - v_commission;
  v_code := public.generate_hotel_reservation_code();

  insert into public.hotel_reservations (
    reservation_code, hotel_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_cents, owner_payout_cents,
    guest_note, status, payment_status
  ) values (
    v_code, p_hotel_id, p_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_commission, v_net,
    nullif(trim(p_guest_note), ''), 'pending_payment', 'pending'
  )
  returning id into v_res_id;

  perform public.log_hotel_reservation_event(v_res_id, 'created', p_guest_id, jsonb_build_object('gross_cents', v_gross));

  return jsonb_build_object(
    'reservation_id', v_res_id,
    'reservation_code', v_code,
    'gross_amount_cents', v_gross,
    'commission_cents', v_commission,
    'owner_payout_cents', v_net,
    'nights', v_nights,
    'hotel_name', v_hotel.name
  );
end;
$$;

create or replace function public.fulfill_hotel_reservation_payment(
  p_reservation_id uuid,
  p_guest_id uuid,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
  v_hotel_name text;
  v_guest_name text;
  v_receipt_body text;
begin
  select r.* into v_res
  from public.hotel_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then return false; end if;
  if v_res.guest_id <> p_guest_id then return false; end if;
  if v_res.status = 'confirmed' then return true; end if;
  if v_res.status <> 'pending_payment' then return false; end if;

  update public.hotel_reservations
  set
    status = 'confirmed',
    payment_status = 'paid',
    stripe_payment_intent_id = p_payment_intent_id,
    paid_at = now(),
    owner_receipt_sent_at = now(),
    updated_at = now()
  where id = p_reservation_id;

  update public.hotel_listings
  set
    occupied_rooms = least(total_rooms, occupied_rooms + 1),
    updated_at = now()
  where id = v_res.hotel_id;

  select name into v_hotel_name from public.hotel_listings where id = v_res.hotel_id;
  select coalesce(username, full_name, 'Misafir') into v_guest_name from public.profiles where id = p_guest_id;

  v_receipt_body := format(
    'Brüt %s ₺ · Net %s ₺ · %s → %s · %s gece · %s kişi',
    to_char(v_res.gross_amount_cents / 100.0, 'FM999999990'),
    to_char(v_res.owner_payout_cents / 100.0, 'FM999999990'),
    to_char(v_res.check_in, 'DD.MM.YYYY'),
    to_char(v_res.check_out, 'DD.MM.YYYY'),
    v_res.nights,
    v_res.guests_count
  );

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'payment_confirmed', p_guest_id,
    jsonb_build_object(
      'payment_intent_id', p_payment_intent_id,
      'amount_cents', p_amount_cents,
      'owner_payout_cents', v_res.owner_payout_cents
    )
  );

  perform public.notify_hotel_reservation_users(
    p_guest_id,
    'hotel_reservation_paid'::public.notification_event_type,
    'Rezervasyon onaylandı',
    v_hotel_name || ' · ' || v_res.reservation_code,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations',
      'segment', 'guest'
    ),
    v_res.owner_id
  );

  perform public.notify_hotel_reservation_users(
    v_res.owner_id,
    'hotel_reservation_received'::public.notification_event_type,
    'Ödeme fişi · ' || v_res.reservation_code,
    v_guest_name || ' · ' || v_hotel_name || ' · ' || v_receipt_body,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations?segment=owner',
      'segment', 'owner',
      'receipt', true,
      'gross_amount_cents', v_res.gross_amount_cents,
      'commission_cents', v_res.commission_cents,
      'owner_payout_cents', v_res.owner_payout_cents,
      'guest_name', v_guest_name,
      'check_in', v_res.check_in,
      'check_out', v_res.check_out,
      'nights', v_res.nights,
      'guests_count', v_res.guests_count,
      'payment_intent_id', p_payment_intent_id
    ),
    p_guest_id
  );

  return true;
end;
$$;

create or replace function public.release_hotel_room_on_cancel(
  p_hotel_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hotel_listings
  set
    occupied_rooms = greatest(0, occupied_rooms - 1),
    updated_at = now()
  where id = p_hotel_id;
end;
$$;

create or replace function public.admin_cancel_hotel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_res from public.hotel_reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('error', 'Rezervasyon bulunamadı');
  end if;

  if v_res.status not in ('pending_payment', 'confirmed') then
    return jsonb_build_object('error', 'Bu rezervasyon iptal edilemez');
  end if;

  if v_res.status = 'confirmed' then
    perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  end if;

  update public.hotel_reservations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_reservation_id;

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'admin_cancelled', auth.uid(),
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  perform public.log_commerce_admin_action(
    'hotel', 'cancel', p_reservation_id, v_res.reservation_code,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_mark_hotel_reservation_refunded(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_res from public.hotel_reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('error', 'Rezervasyon bulunamadı');
  end if;

  if v_res.status = 'confirmed' then
    perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  end if;

  update public.hotel_reservations
  set status = 'refunded', payment_status = 'refunded', updated_at = now()
  where id = p_reservation_id;

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'admin_refunded', auth.uid(),
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  perform public.log_commerce_admin_action(
    'hotel', 'refund', p_reservation_id, v_res.reservation_code,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.release_hotel_room_on_cancel to service_role;

create or replace function public.complete_hotel_reservation(
  p_reservation_id uuid,
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
begin
  select * into v_res
  from public.hotel_reservations
  where id = p_reservation_id and owner_id = p_owner_id
  for update;

  if not found then return false; end if;
  if v_res.status <> 'confirmed' then return false; end if;

  update public.hotel_reservations
  set status = 'completed', updated_at = now()
  where id = p_reservation_id;

  perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  perform public.log_hotel_reservation_event(p_reservation_id, 'completed', p_owner_id, '{}');

  return true;
end;
$$;

grant execute on function public.complete_hotel_reservation to authenticated;
