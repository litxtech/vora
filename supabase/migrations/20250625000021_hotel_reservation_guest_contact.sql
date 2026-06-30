-- Rezervasyon: misafir ad, soyad, telefon + bildirimlerde öncelik

alter table public.hotel_reservations
  add column if not exists guest_first_name text,
  add column if not exists guest_last_name text,
  add column if not exists guest_phone text;

drop function if exists public.create_hotel_reservation(uuid, date, date, smallint, boolean, text);

create or replace function public.create_hotel_reservation(
  p_hotel_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count smallint,
  p_apply_student_discount boolean,
  p_guest_first_name text,
  p_guest_last_name text,
  p_guest_phone text,
  p_guest_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_id uuid := auth.uid();
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
  v_hotel_name text;
  v_guest_full_name text;
  v_phone_clean text;
  v_receipt_body text;
  v_owner_body text;
  v_guest_body text;
begin
  if v_guest_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if nullif(trim(p_guest_first_name), '') is null then
    raise exception 'Ad gerekli';
  end if;

  if nullif(trim(p_guest_last_name), '') is null then
    raise exception 'Soyad gerekli';
  end if;

  v_phone_clean := regexp_replace(coalesce(p_guest_phone, ''), '[^0-9+]', '', 'g');
  if length(regexp_replace(v_phone_clean, '[^0-9]', '', 'g')) < 10 then
    raise exception 'Geçerli bir telefon numarası girin';
  end if;

  select * into v_hotel
  from public.hotel_listings
  where id = p_hotel_id and status = 'published'
  for update;

  if not found then
    raise exception 'Otel bulunamadı veya yayında değil';
  end if;

  if v_hotel.owner_id = v_guest_id then
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
  v_guest_full_name := trim(p_guest_first_name) || ' ' || trim(p_guest_last_name);

  insert into public.hotel_reservations (
    reservation_code, hotel_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_cents, owner_payout_cents,
    guest_first_name, guest_last_name, guest_phone,
    guest_note, status, payment_status, owner_receipt_sent_at
  ) values (
    v_code, p_hotel_id, v_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_commission, v_net,
    trim(p_guest_first_name), trim(p_guest_last_name), trim(p_guest_phone),
    nullif(trim(p_guest_note), ''), 'confirmed', 'at_hotel', now()
  )
  returning id into v_res_id;

  update public.hotel_listings
  set
    occupied_rooms = least(total_rooms, occupied_rooms + 1),
    updated_at = now()
  where id = p_hotel_id;

  v_hotel_name := v_hotel.name;

  v_owner_body := v_code
    || ' · ' || v_hotel_name
    || ' · ' || to_char(p_check_in, 'DD.MM') || '→' || to_char(p_check_out, 'DD.MM')
    || ' · ' || trim(p_guest_phone);

  v_guest_body := v_code
    || ' · ' || v_hotel_name
    || ' · ' || to_char(p_check_in, 'DD.MM') || '→' || to_char(p_check_out, 'DD.MM')
    || ' · ' || v_nights || ' gece';

  v_receipt_body := format(
    '%s · Tahmini %s ₺ · %s → %s · %s gece · %s kişi · %s',
    v_code,
    to_char(v_gross / 100.0, 'FM999999990'),
    to_char(p_check_in, 'DD.MM.YYYY'),
    to_char(p_check_out, 'DD.MM.YYYY'),
    v_nights,
    coalesce(p_guests_count, 1),
    trim(p_guest_phone)
  );

  perform public.log_hotel_reservation_event(
    v_res_id, 'confirmed', v_guest_id,
    jsonb_build_object(
      'gross_cents', v_gross,
      'payment_status', 'at_hotel',
      'guest_name', v_guest_full_name,
      'guest_phone', trim(p_guest_phone)
    )
  );

  perform public.notify_hotel_reservation_users(
    v_guest_id,
    'hotel_reservation_paid'::public.notification_event_type,
    'Rezervasyon alındı',
    v_guest_body,
    jsonb_build_object(
      'reservation_id', v_res_id,
      'reservation_code', v_code,
      'hotel_id', p_hotel_id,
      'guest_name', v_guest_full_name,
      'deep_link', '/hotel-center/reservations',
      'segment', 'guest'
    ),
    v_hotel.owner_id
  );

  perform public.notify_hotel_reservation_users(
    v_hotel.owner_id,
    'hotel_reservation_received'::public.notification_event_type,
    v_guest_full_name,
    v_owner_body,
    jsonb_build_object(
      'reservation_id', v_res_id,
      'reservation_code', v_code,
      'hotel_id', p_hotel_id,
      'deep_link', '/hotel-center/reservations?segment=owner',
      'segment', 'owner',
      'receipt', true,
      'guest_name', v_guest_full_name,
      'guest_first_name', trim(p_guest_first_name),
      'guest_last_name', trim(p_guest_last_name),
      'guest_phone', trim(p_guest_phone),
      'gross_amount_cents', v_gross,
      'commission_cents', v_commission,
      'owner_payout_cents', v_net,
      'check_in', p_check_in,
      'check_out', p_check_out,
      'nights', v_nights,
      'guests_count', coalesce(p_guests_count, 1),
      'payment_status', 'at_hotel'
    ),
    v_guest_id
  );

  return jsonb_build_object(
    'reservation_id', v_res_id,
    'reservation_code', v_code,
    'gross_amount_cents', v_gross,
    'commission_cents', v_commission,
    'owner_payout_cents', v_net,
    'nights', v_nights,
    'hotel_name', v_hotel_name,
    'guest_name', v_guest_full_name
  );
end;
$$;

grant execute on function public.create_hotel_reservation(
  uuid, date, date, smallint, boolean, text, text, text, text
) to authenticated;
