-- Otel Stripe checkout: bekleyen rezervasyonda misafir iletişim bilgisi

drop function if exists public.create_hotel_reservation_pending(
  uuid, uuid, date, date, smallint, boolean, text, uuid
);

create or replace function public.create_hotel_reservation_pending(
  p_hotel_id uuid,
  p_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count smallint,
  p_apply_student_discount boolean,
  p_guest_note text default null,
  p_room_type_id uuid default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_guest_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel public.hotel_listings%rowtype;
  v_room public.hotel_room_types%rowtype;
  v_has_room_types boolean;
  v_nights int;
  v_nightly_cents int;
  v_discount_pct smallint;
  v_gross int;
  v_commission int;
  v_net int;
  v_rate numeric(5, 4);
  v_res_id uuid;
  v_code text;
  v_available int;
  v_phone_clean text;
begin
  if p_guest_id is distinct from auth.uid() then
    raise exception 'Unauthorized';
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

  if v_hotel.owner_id = p_guest_id then
    raise exception 'Kendi otelinize rezervasyon yapamazsınız';
  end if;

  select exists(select 1 from public.hotel_room_types where hotel_id = p_hotel_id)
  into v_has_room_types;

  if v_has_room_types then
    if p_room_type_id is null then
      raise exception 'Lütfen bir oda tipi seçin';
    end if;

    select * into v_room
    from public.hotel_room_types
    where id = p_room_type_id and hotel_id = p_hotel_id
    for update;

    if not found then
      raise exception 'Oda tipi bulunamadı';
    end if;

    if coalesce(p_guests_count, 1) > v_room.max_guests then
      raise exception 'Seçilen oda en fazla % kişi alır', v_room.max_guests;
    end if;

    v_available := v_room.total_count - v_room.occupied_count;
    v_nightly_cents := v_room.price_per_night * 100;
  else
    v_available := coalesce(v_hotel.total_rooms, 1) - coalesce(v_hotel.occupied_rooms, 0);
    v_nightly_cents := v_hotel.price_per_night * 100;
  end if;

  if v_available < 1 then
    raise exception 'Müsait oda bulunmuyor';
  end if;

  v_nights := (p_check_out - p_check_in);
  if v_nights < 1 then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  v_discount_pct := case when p_apply_student_discount and v_hotel.student_discount_pct > 0
    then v_hotel.student_discount_pct else 0 end;

  v_gross := round(v_nightly_cents * v_nights * (1 - v_discount_pct::numeric / 100))::int;
  if v_gross < 200 then
    raise exception 'Minimum rezervasyon tutarı 2 ₺ olmalıdır';
  end if;

  if v_hotel.business_id is not null then
    select c.commission_rate, c.commission_cents, c.net_cents
    into v_rate, v_commission, v_net
    from public.compute_business_store_commission(v_gross, 'hotel', v_hotel.business_id) c;
  else
    v_rate := 0.12;
    v_commission := round(v_gross * v_rate)::int;
    v_net := v_gross - v_commission;
  end if;

  v_code := public.generate_hotel_reservation_code();

  insert into public.hotel_reservations (
    reservation_code, hotel_id, room_type_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_rate, commission_cents, owner_payout_cents,
    guest_first_name, guest_last_name, guest_phone,
    guest_note, status, payment_status
  ) values (
    v_code, p_hotel_id, p_room_type_id, p_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_rate, v_commission, v_net,
    trim(p_guest_first_name), trim(p_guest_last_name), trim(p_guest_phone),
    nullif(trim(p_guest_note), ''), 'pending_payment', 'pending'
  )
  returning id into v_res_id;

  perform public.log_hotel_reservation_event(
    v_res_id, 'created', p_guest_id,
    jsonb_build_object(
      'gross_cents', v_gross,
      'commission_rate', v_rate,
      'room_type_id', p_room_type_id,
      'guest_phone', trim(p_guest_phone)
    )
  );

  return jsonb_build_object(
    'reservation_id', v_res_id,
    'reservation_code', v_code,
    'gross_amount_cents', v_gross,
    'commission_rate', v_rate,
    'commission_cents', v_commission,
    'owner_payout_cents', v_net,
    'nights', v_nights,
    'hotel_name', v_hotel.name
  );
end;
$$;

grant execute on function public.create_hotel_reservation_pending(
  uuid, uuid, date, date, smallint, boolean, text, uuid, text, text, text
) to authenticated;
