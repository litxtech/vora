-- İşletme mağazası komisyon politikası:
-- ürün %15, otel %12, ilk 3 ay %10, premium −2 puan, min. komisyon ₺5–10

alter table public.businesses
  add column if not exists registration_approved_at timestamptz;

update public.businesses
set registration_approved_at = coalesce(registration_approved_at, created_at)
where registration_status = 'approved'
  and registration_approved_at is null;

create or replace function public.set_business_registration_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.registration_status = 'approved'
     and (tg_op = 'INSERT' or old.registration_status is distinct from 'approved') then
    new.registration_approved_at := coalesce(new.registration_approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_registration_approved_at on public.businesses;
create trigger businesses_registration_approved_at
  before insert or update of registration_status on public.businesses
  for each row
  execute function public.set_business_registration_approved_at();

create or replace function public.resolve_business_commission_rate(
  p_kind text,
  p_business_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_owner_premium boolean;
  v_rate numeric;
begin
  select * into v_business
  from public.businesses
  where id = p_business_id;

  if not found then
    return case when p_kind = 'hotel' then 0.12 else 0.15 end;
  end if;

  select coalesce(p.is_premium, false) into v_owner_premium
  from public.profiles p
  where p.id = v_business.owner_id;

  if v_business.registration_approved_at is not null
     and v_business.registration_approved_at > now() - interval '90 days' then
    v_rate := 0.10;
  else
    v_rate := case when p_kind = 'hotel' then 0.12 else 0.15 end;
  end if;

  if v_owner_premium then
    v_rate := greatest(0, v_rate - 0.02);
  end if;

  return v_rate;
end;
$$;

create or replace function public.apply_business_min_commission_cents(
  p_gross_cents integer,
  p_commission_cents integer
)
returns integer
language plpgsql
immutable
as $$
declare
  v_min int;
begin
  if p_gross_cents <= 1 then
    return greatest(0, p_gross_cents);
  end if;

  v_min := case
    when p_gross_cents < 3000 then 1000
    else 500
  end;

  return greatest(
    least(p_commission_cents, p_gross_cents - 1),
    v_min
  );
end;
$$;

create or replace function public.compute_business_store_commission(
  p_gross_cents integer,
  p_kind text,
  p_business_id uuid
)
returns table (
  commission_rate numeric,
  commission_cents integer,
  net_cents integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate numeric;
  v_raw int;
  v_commission int;
begin
  v_rate := public.resolve_business_commission_rate(p_kind, p_business_id);
  v_raw := round(p_gross_cents * v_rate)::int;
  v_commission := public.apply_business_min_commission_cents(p_gross_cents, v_raw);

  return query
  select v_rate, v_commission, p_gross_cents - v_commission;
end;
$$;

create or replace function public.fulfill_marketplace_order(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_gross_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_commission int;
  v_net int;
  v_rate numeric(5, 4);
  v_title text;
begin
  select * into v_listing from public.marketplace_listings where id = p_listing_id for update;
  if not found then return null; end if;
  if v_listing.status <> 'active' or v_listing.content_status <> 'published' then
    return null;
  end if;
  if v_listing.author_id = p_buyer_id then return null; end if;

  if v_listing.business_id is not null then
    select c.commission_rate, c.commission_cents, c.net_cents
    into v_rate, v_commission, v_net
    from public.compute_business_store_commission(p_gross_cents, 'product', v_listing.business_id) c;
  else
    v_rate := 0.15;
    v_commission := round(p_gross_cents * v_rate)::int;
    v_net := p_gross_cents - v_commission;
  end if;

  v_order_number := public.generate_marketplace_order_number();
  v_title := v_listing.title;

  insert into public.marketplace_orders (
    order_number, listing_id, buyer_id, seller_id, business_id,
    gross_amount_cents, commission_rate, commission_cents, seller_net_cents,
    stripe_checkout_session_id, stripe_payment_intent_id,
    status, paid_at
  )
  values (
    v_order_number, p_listing_id, p_buyer_id, v_listing.author_id, v_listing.business_id,
    p_gross_cents, v_rate, v_commission, v_net,
    p_session_id, p_payment_intent_id,
    'paid_escrow', now()
  )
  returning id into v_order_id;

  update public.marketplace_listings
  set status = 'reserved', updated_at = now()
  where id = p_listing_id;

  perform public.log_marketplace_order_event(
    v_order_id, 'payment_received', p_buyer_id, 'buyer',
    jsonb_build_object('gross_cents', p_gross_cents, 'session_id', p_session_id, 'commission_rate', v_rate)
  );

  perform public.notify_marketplace_user(
    p_buyer_id, 'marketplace_order_paid', 'Ödemeniz alındı',
    v_title || ' — ödemeniz güvence altında.',
    jsonb_build_object('order_id', v_order_id, 'listing_id', p_listing_id),
    v_listing.author_id
  );

  perform public.notify_marketplace_user(
    v_listing.author_id, 'marketplace_order_paid', 'Yeni satış!',
    v_title || ' — lütfen teslimat bildirimi yapın.',
    jsonb_build_object('order_id', v_order_id, 'listing_id', p_listing_id),
    p_buyer_id
  );

  return v_order_id;
end;
$$;

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
  v_rate numeric(5, 4);
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
    reservation_code, hotel_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_rate, commission_cents, owner_payout_cents,
    guest_note, status, payment_status
  ) values (
    v_code, p_hotel_id, p_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_rate, v_commission, v_net,
    nullif(trim(p_guest_note), ''), 'pending_payment', 'pending'
  )
  returning id into v_res_id;

  perform public.log_hotel_reservation_event(v_res_id, 'created', p_guest_id, jsonb_build_object('gross_cents', v_gross, 'commission_rate', v_rate));

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
  v_rate numeric(5, 4);
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
  v_guest_full_name := trim(p_guest_first_name) || ' ' || trim(p_guest_last_name);

  insert into public.hotel_reservations (
    reservation_code, hotel_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_rate, commission_cents, owner_payout_cents,
    guest_first_name, guest_last_name, guest_phone,
    guest_note, status, payment_status, owner_receipt_sent_at
  ) values (
    v_code, p_hotel_id, v_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_rate, v_commission, v_net,
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
      'commission_rate', v_rate,
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

grant execute on function public.resolve_business_commission_rate(text, uuid) to authenticated, service_role;
grant execute on function public.compute_business_store_commission(integer, text, uuid) to authenticated, service_role;
