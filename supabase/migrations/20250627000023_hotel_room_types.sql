-- Otel oda tipleri: işletme farklı oda kategorileri tanımlayabilir

create table public.hotel_room_types (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotel_listings (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  price_per_night integer not null check (price_per_night > 0),
  list_price_per_night integer,
  total_count smallint not null default 1 check (total_count >= 1),
  occupied_count smallint not null default 0 check (occupied_count >= 0),
  max_guests smallint not null default 2 check (max_guests between 1 and 12),
  media_urls text[] not null default '{}',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hotel_room_types_occupancy_check check (occupied_count <= total_count),
  constraint hotel_room_types_list_price_check check (
    list_price_per_night is null or list_price_per_night > price_per_night
  )
);

create index hotel_room_types_hotel_idx
  on public.hotel_room_types (hotel_id, sort_order asc, created_at asc);

alter table public.hotel_reservations
  add column if not exists room_type_id uuid references public.hotel_room_types (id) on delete set null;

create index if not exists hotel_reservations_room_type_idx
  on public.hotel_reservations (room_type_id)
  where room_type_id is not null;

-- Mevcut oteller için varsayılan oda tipi
insert into public.hotel_room_types (
  hotel_id, name, price_per_night, list_price_per_night, total_count, occupied_count, sort_order
)
select
  h.id,
  'Standart Oda',
  h.price_per_night,
  h.list_price_per_night,
  coalesce(h.total_rooms, 1),
  coalesce(h.occupied_rooms, 0),
  0
from public.hotel_listings h
where not exists (
  select 1 from public.hotel_room_types rt where rt.hotel_id = h.id
);

create or replace function public.sync_hotel_listing_from_room_types(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_min_price int;
  v_min_list int;
  v_total smallint;
  v_occupied smallint;
begin
  select count(*)::int into v_count
  from public.hotel_room_types
  where hotel_id = p_hotel_id;

  if v_count = 0 then
    return;
  end if;

  select
    min(price_per_night),
    min(list_price_per_night) filter (where list_price_per_night is not null),
    coalesce(sum(total_count), 0)::smallint,
    coalesce(sum(occupied_count), 0)::smallint
  into v_min_price, v_min_list, v_total, v_occupied
  from public.hotel_room_types
  where hotel_id = p_hotel_id;

  update public.hotel_listings
  set
    price_per_night = v_min_price,
    list_price_per_night = case
      when v_min_list is not null and v_min_list > v_min_price then v_min_list
      else null
    end,
    total_rooms = greatest(1, v_total),
    occupied_rooms = least(greatest(1, v_total), v_occupied),
    updated_at = now()
  where id = p_hotel_id;
end;
$$;

create or replace function public.hotel_room_types_sync_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_hotel_listing_from_room_types(
    case when tg_op = 'DELETE' then old.hotel_id else new.hotel_id end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists hotel_room_types_listing_sync on public.hotel_room_types;
create trigger hotel_room_types_listing_sync
  after insert or update or delete on public.hotel_room_types
  for each row execute function public.hotel_room_types_sync_listing();

create or replace function public.release_hotel_room_on_cancel(
  p_hotel_id uuid,
  p_room_type_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_type_id is not null then
    update public.hotel_room_types
    set
      occupied_count = greatest(0, occupied_count - 1),
      updated_at = now()
    where id = p_room_type_id and hotel_id = p_hotel_id;

    perform public.sync_hotel_listing_from_room_types(p_hotel_id);
    return;
  end if;

  update public.hotel_listings
  set
    occupied_rooms = greatest(0, occupied_rooms - 1),
    updated_at = now()
  where id = p_hotel_id;
end;
$$;

create or replace function public.occupy_hotel_room_on_reserve(
  p_hotel_id uuid,
  p_room_type_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_type_id is not null then
    update public.hotel_room_types
    set
      occupied_count = least(total_count, occupied_count + 1),
      updated_at = now()
    where id = p_room_type_id and hotel_id = p_hotel_id;

    perform public.sync_hotel_listing_from_room_types(p_hotel_id);
    return;
  end if;

  update public.hotel_listings
  set
    occupied_rooms = least(total_rooms, occupied_rooms + 1),
    updated_at = now()
  where id = p_hotel_id;
end;
$$;

-- RLS
alter table public.hotel_room_types enable row level security;

create policy hotel_room_types_read on public.hotel_room_types
  for select using (
    exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id
        and (h.status = 'published' or h.owner_id = auth.uid())
    )
  );

create policy hotel_room_types_insert on public.hotel_room_types
  for insert to authenticated
  with check (
    exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy hotel_room_types_update on public.hotel_room_types
  for update to authenticated
  using (
    exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy hotel_room_types_delete on public.hotel_room_types
  for delete to authenticated
  using (
    exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

grant execute on function public.sync_hotel_listing_from_room_types(uuid) to authenticated, service_role;
grant execute on function public.occupy_hotel_room_on_reserve(uuid, uuid) to service_role;

-- Rezervasyon RPC: oda tipi desteği
drop function if exists public.create_hotel_reservation_pending(
  uuid, uuid, date, date, smallint, boolean, text
);

create or replace function public.create_hotel_reservation_pending(
  p_hotel_id uuid,
  p_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count smallint,
  p_apply_student_discount boolean,
  p_guest_note text default null,
  p_room_type_id uuid default null
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
    reservation_code, hotel_id, room_type_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_rate, commission_cents, owner_payout_cents,
    guest_note, status, payment_status
  ) values (
    v_code, p_hotel_id, p_room_type_id, p_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_rate, v_commission, v_net,
    nullif(trim(p_guest_note), ''), 'pending_payment', 'pending'
  )
  returning id into v_res_id;

  perform public.log_hotel_reservation_event(
    v_res_id, 'created', p_guest_id,
    jsonb_build_object('gross_cents', v_gross, 'commission_rate', v_rate, 'room_type_id', p_room_type_id)
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

drop function if exists public.create_hotel_reservation(
  uuid, date, date, smallint, boolean, text, text, text, text
);

create or replace function public.create_hotel_reservation(
  p_hotel_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count smallint,
  p_apply_student_discount boolean,
  p_guest_first_name text,
  p_guest_last_name text,
  p_guest_phone text,
  p_guest_note text default null,
  p_room_type_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_id uuid := auth.uid();
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
    reservation_code, hotel_id, room_type_id, guest_id, owner_id,
    check_in, check_out, nights, guests_count,
    nightly_price_cents, student_discount_pct,
    gross_amount_cents, commission_rate, commission_cents, owner_payout_cents,
    guest_first_name, guest_last_name, guest_phone,
    guest_note, status, payment_status, owner_receipt_sent_at
  ) values (
    v_code, p_hotel_id, p_room_type_id, v_guest_id, v_hotel.owner_id,
    p_check_in, p_check_out, v_nights, coalesce(p_guests_count, 1),
    v_nightly_cents, v_discount_pct,
    v_gross, v_rate, v_commission, v_net,
    trim(p_guest_first_name), trim(p_guest_last_name), trim(p_guest_phone),
    nullif(trim(p_guest_note), ''), 'confirmed', 'at_hotel', now()
  )
  returning id into v_res_id;

  perform public.occupy_hotel_room_on_reserve(p_hotel_id, p_room_type_id);

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
      'guest_phone', trim(p_guest_phone),
      'room_type_id', p_room_type_id
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
      'payment_status', 'at_hotel',
      'room_type_id', p_room_type_id
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

grant execute on function public.create_hotel_reservation_pending(
  uuid, uuid, date, date, smallint, boolean, text, uuid
) to authenticated;

grant execute on function public.create_hotel_reservation(
  uuid, date, date, smallint, boolean, text, text, text, text, uuid
) to authenticated;

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

  perform public.occupy_hotel_room_on_reserve(v_res.hotel_id, v_res.room_type_id);

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
      'owner_payout_cents', v_res.owner_payout_cents,
      'room_type_id', v_res.room_type_id
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
    'Ödeme alındı · ' || v_res.reservation_code,
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
      'payment_intent_id', p_payment_intent_id,
      'room_type_id', v_res.room_type_id
    ),
    p_guest_id
  );

  return true;
end;
$$;

-- İptal / tamamlama: oda tipi bazlı serbest bırakma
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
    perform public.release_hotel_room_on_cancel(v_res.hotel_id, v_res.room_type_id);
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
    perform public.release_hotel_room_on_cancel(v_res.hotel_id, v_res.room_type_id);
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

  perform public.release_hotel_room_on_cancel(v_res.hotel_id, v_res.room_type_id);
  perform public.log_hotel_reservation_event(p_reservation_id, 'completed', p_owner_id, '{}');

  return true;
end;
$$;

alter publication supabase_realtime add table public.hotel_room_types;
