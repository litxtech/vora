-- Paylaşımlı Yolculuk (Vora Ride) — yolculuklar, araçlar, rezervasyonlar, puanlar

-- ─── Enumlar ─────────────────────────────────────────────────────────────────

create type public.ride_vehicle_type as enum ('car', 'minibus', 'van');

create type public.ride_vehicle_verification_status as enum ('pending', 'approved', 'rejected');

create type public.ride_trip_type as enum ('one_way', 'round_trip', 'recurring', 'event_route');

create type public.ride_trip_status as enum (
  'draft',
  'published',
  'full',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.ride_luggage_size as enum ('none', 'small', 'medium', 'large');

create type public.ride_music_preference as enum ('any', 'quiet', 'driver_choice', 'passenger_choice');

create type public.ride_reservation_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'completed',
  'no_show'
);

create type public.ride_payment_status as enum (
  'pending',
  'held',
  'released',
  'refunded',
  'failed'
);

create type public.ride_review_role as enum ('driver_to_passenger', 'passenger_to_driver');

create type public.ride_complaint_status as enum ('open', 'investigating', 'resolved', 'dismissed');

create type public.ride_license_verification_status as enum ('pending', 'approved', 'rejected');

-- ─── Ehliyet doğrulama ───────────────────────────────────────────────────────

create table public.ride_license_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.ride_license_verification_status not null default 'pending',
  license_front_path text not null,
  license_back_path text,
  selfie_path text not null,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index ride_license_verifications_user_idx
  on public.ride_license_verifications (user_id, created_at desc);

-- ─── Araçlar ─────────────────────────────────────────────────────────────────

create table public.ride_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null check (char_length(trim(brand)) >= 1),
  model text not null check (char_length(trim(model)) >= 1),
  year int check (year is null or year between 1980 and 2030),
  plate text not null check (char_length(trim(plate)) >= 4),
  color text,
  vehicle_type public.ride_vehicle_type not null default 'car',
  seats_total int not null check (seats_total between 1 and 16),
  photo_urls text[] not null default '{}',
  cover_url text,
  verification_status public.ride_vehicle_verification_status not null default 'pending',
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_vehicles_photos_check check (cardinality(photo_urls) <= 6)
);

create index ride_vehicles_user_idx on public.ride_vehicles (user_id, is_active, created_at desc);

-- ─── Yolculuklar ─────────────────────────────────────────────────────────────

create table public.ride_trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.ride_vehicles (id) on delete set null,
  region_id text not null references public.regions (id),
  from_city_id text not null,
  to_city_id text not null,
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision,
  meeting_point text,
  dropoff_point text,
  trip_type public.ride_trip_type not null default 'one_way',
  contribution_cents int not null check (contribution_cents >= 0),
  currency text not null default 'try',
  seats_total int not null check (seats_total between 1 and 16),
  available_seats int not null check (available_seats >= 0),
  departure_date date not null,
  departure_time time not null,
  estimated_duration_minutes int,
  description text check (description is null or char_length(trim(description)) <= 2000),
  luggage public.ride_luggage_size not null default 'small',
  smoking_allowed boolean not null default false,
  pets_allowed boolean not null default false,
  women_only boolean not null default false,
  music_preference public.ride_music_preference not null default 'any',
  status public.ride_trip_status not null default 'draft',
  cancellation_reason text,
  cancelled_by uuid references public.profiles (id) on delete set null,
  view_count int not null default 0,
  favorite_count int not null default 0,
  published_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_trips_seats_check check (available_seats <= seats_total)
);

create index ride_trips_search_idx
  on public.ride_trips (region_id, status, departure_date, departure_time)
  where status in ('published', 'full', 'in_progress');

create index ride_trips_driver_idx on public.ride_trips (driver_id, status, created_at desc);

create index ride_trips_route_idx
  on public.ride_trips (from_city_id, to_city_id, departure_date)
  where status in ('published', 'full');

-- ─── Ara duraklar ────────────────────────────────────────────────────────────

create table public.ride_trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.ride_trips (id) on delete cascade,
  city_id text not null,
  stop_order int not null check (stop_order >= 1),
  latitude double precision,
  longitude double precision,
  unique (trip_id, stop_order)
);

create index ride_trip_stops_trip_idx on public.ride_trip_stops (trip_id, stop_order);

-- ─── Rezervasyonlar ─────────────────────────────────────────────────────────

create table public.ride_reservations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.ride_trips (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  seat_count int not null check (seat_count between 1 and 8),
  status public.ride_reservation_status not null default 'pending',
  payment_status public.ride_payment_status not null default 'pending',
  amount_cents int not null default 0,
  commission_cents int not null default 0,
  driver_payout_cents int not null default 0,
  pickup_stop_id uuid references public.ride_trip_stops (id) on delete set null,
  passenger_note text check (passenger_note is null or char_length(trim(passenger_note)) <= 500),
  approved_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ride_reservations_trip_idx on public.ride_reservations (trip_id, status);
create index ride_reservations_passenger_idx on public.ride_reservations (passenger_id, status, created_at desc);

-- ─── Puanlar ─────────────────────────────────────────────────────────────────

create table public.ride_reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.ride_trips (id) on delete cascade,
  reservation_id uuid not null references public.ride_reservations (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles (id) on delete cascade,
  role public.ride_review_role not null,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(trim(comment)) <= 500),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (reviewer_id, reservation_id, role)
);

create index ride_reviews_reviewed_idx on public.ride_reviews (reviewed_user_id, created_at desc);

-- ─── Favoriler ───────────────────────────────────────────────────────────────

create table public.ride_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.ride_trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

-- ─── Canlı konum ─────────────────────────────────────────────────────────────

create table public.ride_live_locations (
  trip_id uuid primary key references public.ride_trips (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  current_city_id text,
  eta_minutes int,
  updated_at timestamptz not null default now()
);

-- ─── Trip chat bağlantısı ────────────────────────────────────────────────────

create table public.ride_trip_conversations (
  trip_id uuid primary key references public.ride_trips (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── Şikayetler ──────────────────────────────────────────────────────────────

create table public.ride_complaints (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.ride_trips (id) on delete set null,
  reservation_id uuid references public.ride_reservations (id) on delete set null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  category text not null check (category in ('safety', 'payment', 'behavior', 'fake', 'other')),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  evidence_urls text[] not null default '{}',
  status public.ride_complaint_status not null default 'open',
  admin_notes text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Favori sayacı ───────────────────────────────────────────────────────────

create or replace function public.sync_ride_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.ride_trips set favorite_count = favorite_count + 1 where id = new.trip_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.ride_trips set favorite_count = greatest(favorite_count - 1, 0) where id = old.trip_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists ride_favorite_count_sync on public.ride_favorites;
create trigger ride_favorite_count_sync
  after insert or delete on public.ride_favorites
  for each row execute function public.sync_ride_favorite_count();

-- ─── RPC: yolculuk ara ───────────────────────────────────────────────────────

create or replace function public.search_ride_trips(
  p_region_id text default null,
  p_from_city_id text default null,
  p_to_city_id text default null,
  p_departure_date date default null,
  p_min_seats int default 1,
  p_women_only boolean default null,
  p_pets_allowed boolean default null,
  p_no_smoking boolean default null,
  p_max_contribution_cents int default null,
  p_sort text default 'departure',
  p_limit int default 30,
  p_offset int default 0
)
returns setof public.ride_trips
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select t.*
  from public.ride_trips t
  where t.status in ('published', 'full')
    and t.available_seats >= greatest(coalesce(p_min_seats, 1), 1)
    and (p_region_id is null or t.region_id = p_region_id)
    and (p_from_city_id is null or t.from_city_id = p_from_city_id)
    and (p_to_city_id is null or t.to_city_id = p_to_city_id)
    and (p_departure_date is null or t.departure_date = p_departure_date)
    and (p_women_only is null or t.women_only = p_women_only)
    and (p_pets_allowed is null or t.pets_allowed = p_pets_allowed)
    and (p_no_smoking is null or (p_no_smoking = true and t.smoking_allowed = false))
    and (p_max_contribution_cents is null or t.contribution_cents <= p_max_contribution_cents)
    and t.departure_date >= current_date
  order by
    case when p_sort = 'contribution_asc' then t.contribution_cents end asc,
    case when p_sort = 'contribution_desc' then t.contribution_cents end desc,
    case when p_sort = 'seats' then t.available_seats end asc,
    t.departure_date asc,
    t.departure_time asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

-- ─── RPC: rezervasyon talebi ─────────────────────────────────────────────────

create or replace function public.request_ride_reservation(
  p_trip_id uuid,
  p_seat_count int,
  p_passenger_note text default null,
  p_pickup_stop_id uuid default null
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
  v_gender public.gender_type;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
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

  if v_trip.women_only then
    select gender into v_gender from public.profiles where id = auth.uid();
    if v_gender is distinct from 'female' then
      raise exception 'Bu yolculuk yalnızca kadın yolcular içindir';
    end if;
  end if;

  if exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and passenger_id = auth.uid()
      and status in ('pending', 'approved')
  ) then
    raise exception 'Bu yolculuk için zaten aktif bir rezervasyonunuz var';
  end if;

  v_amount := v_trip.contribution_cents * p_seat_count;
  v_commission := round(v_amount * 0.10);
  v_payout := v_amount - v_commission;

  insert into public.ride_reservations (
    trip_id, passenger_id, seat_count, amount_cents, commission_cents, driver_payout_cents, passenger_note, pickup_stop_id
  )
  values (
    p_trip_id, auth.uid(), p_seat_count, v_amount, v_commission, v_payout,
    nullif(trim(coalesce(p_passenger_note, '')), ''), p_pickup_stop_id
  )
  returning id into v_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_reservation_new',
    'Yeni rezervasyon talebi',
    p_seat_count || ' koltuk için yeni talep',
    jsonb_build_object('trip_id', p_trip_id, 'reservation_id', v_reservation_id),
    auth.uid()
  );

  return v_reservation_id;
end;
$$;

-- ─── RPC: rezervasyon yanıtı ─────────────────────────────────────────────────

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
  if not found or v_res.status <> 'pending' then
    raise exception 'Rezervasyon bulunamadı veya işlenemez';
  end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.driver_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_approve then
    if v_res.seat_count > v_trip.available_seats then
      raise exception 'Yeterli boş koltuk yok';
    end if;
    update public.ride_reservations
    set status = 'approved', payment_status = 'held', approved_at = now(), updated_at = now()
    where id = p_reservation_id;

    update public.ride_trips
    set available_seats = available_seats - v_res.seat_count,
        status = case when available_seats - v_res.seat_count <= 0 then 'full'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;

    perform public.ensure_ride_trip_conversation(v_trip.id);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id,
      'ride_reservation_approved',
      'Rezervasyon onaylandı',
      'Yolculuk rezervasyonunuz onaylandı',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  else
    update public.ride_reservations
    set status = 'rejected', updated_at = now()
    where id = p_reservation_id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id,
      'ride_reservation_rejected',
      'Rezervasyon reddedildi',
      'Yolculuk rezervasyonunuz reddedildi',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  end if;
end;
$$;

-- ─── RPC: trip chat ──────────────────────────────────────────────────────────

create or replace function public.ensure_ride_trip_conversation(p_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_conversation_id uuid;
  v_title text;
  v_passenger_id uuid;
begin
  select conversation_id into v_conversation_id
  from public.ride_trip_conversations where trip_id = p_trip_id;

  if v_conversation_id is not null then
    for v_passenger_id in
      select passenger_id from public.ride_reservations
      where trip_id = p_trip_id and status = 'approved'
    loop
      insert into public.conversation_members (conversation_id, user_id, role)
      values (v_conversation_id, v_passenger_id, 'member')
      on conflict do nothing;
    end loop;
    return v_conversation_id;
  end if;

  select * into v_trip from public.ride_trips where id = p_trip_id;
  v_title := left(v_trip.from_city_id || ' → ' || v_trip.to_city_id || ' · ' || to_char(v_trip.departure_date, 'DD Mon'), 80);

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_trip.driver_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_trip.driver_id, 'founder');

  for v_passenger_id in
    select passenger_id from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved'
  loop
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, v_passenger_id, 'member')
    on conflict do nothing;
  end loop;

  insert into public.ride_trip_conversations (trip_id, conversation_id)
  values (p_trip_id, v_conversation_id);

  return v_conversation_id;
end;
$$;

-- ─── RPC: yolculuk başlat / bitir / iptal ────────────────────────────────────

create or replace function public.start_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_passenger_id uuid;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status not in ('published', 'full') then raise exception 'Yolculuk başlatılamaz'; end if;

  update public.ride_trips
  set status = 'in_progress', started_at = now(), updated_at = now()
  where id = p_trip_id;

  for v_passenger_id in
    select passenger_id from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved'
  loop
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_passenger_id,
      'ride_trip_started',
      'Yolculuk başladı',
      'Sürücü yola çıktı — canlı konumu takip edebilirsiniz',
      jsonb_build_object('trip_id', p_trip_id),
      auth.uid()
    );
  end loop;
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
  v_passenger_id uuid;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  update public.ride_trips
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_trip_id;

  update public.ride_reservations
  set status = 'completed', payment_status = 'released', completed_at = now(), updated_at = now()
  where trip_id = p_trip_id and status = 'approved';

  delete from public.ride_live_locations where trip_id = p_trip_id;

  for v_passenger_id in
    select passenger_id from public.ride_reservations
    where trip_id = p_trip_id and status = 'completed'
  loop
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_passenger_id,
      'ride_trip_completed',
      'Yolculuk tamamlandı',
      'Deneyiminizi puanlayın',
      jsonb_build_object('trip_id', p_trip_id),
      auth.uid()
    );
  end loop;
end;
$$;

create or replace function public.cancel_ride_trip(p_trip_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_res public.ride_reservations;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;
  if v_trip.status in ('completed', 'cancelled') then raise exception 'İptal edilemez'; end if;

  update public.ride_trips
  set status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(), updated_at = now()
  where id = p_trip_id;

  for v_res in select * from public.ride_reservations where trip_id = p_trip_id and status in ('pending', 'approved')
  loop
    update public.ride_reservations
    set status = 'cancelled', payment_status = 'refunded', cancelled_at = now(), updated_at = now()
    where id = v_res.id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id,
      'ride_trip_cancelled',
      'Yolculuk iptal edildi',
      coalesce(p_reason, 'Sürücü yolculuğu iptal etti'),
      jsonb_build_object('trip_id', p_trip_id, 'reservation_id', v_res.id),
      auth.uid()
    );
  end loop;

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

-- ─── RPC: canlı konum ────────────────────────────────────────────────────────

create or replace function public.upsert_ride_live_location(
  p_trip_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_heading double precision default null,
  p_current_city_id text default null,
  p_eta_minutes int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  if not exists (
    select 1 from public.ride_trips
    where id = p_trip_id and driver_id = auth.uid() and status = 'in_progress'
  ) then
    raise exception 'Canlı konum paylaşılamıyor';
  end if;

  insert into public.ride_live_locations (trip_id, driver_id, latitude, longitude, heading, current_city_id, eta_minutes, updated_at)
  values (p_trip_id, auth.uid(), p_latitude, p_longitude, p_heading, p_current_city_id, p_eta_minutes, now())
  on conflict (trip_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    heading = excluded.heading,
    current_city_id = excluded.current_city_id,
    eta_minutes = excluded.eta_minutes,
    updated_at = now();
end;
$$;

-- ─── RPC: puan ───────────────────────────────────────────────────────────────

create or replace function public.submit_ride_review(
  p_reservation_id uuid,
  p_rating int,
  p_comment text default null,
  p_tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
  v_role public.ride_review_role;
  v_reviewed uuid;
  v_id uuid;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id;
  if not found or v_res.status <> 'completed' then
    raise exception 'Puanlanamaz';
  end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;

  if auth.uid() = v_res.passenger_id then
    v_role := 'passenger_to_driver';
    v_reviewed := v_trip.driver_id;
  elsif auth.uid() = v_trip.driver_id then
    v_role := 'driver_to_passenger';
    v_reviewed := v_res.passenger_id;
  else
    raise exception 'Yetkisiz';
  end if;

  insert into public.ride_reviews (trip_id, reservation_id, reviewer_id, reviewed_user_id, role, rating, comment, tags)
  values (v_trip.id, p_reservation_id, auth.uid(), v_reviewed, v_role, p_rating, nullif(trim(coalesce(p_comment, '')), ''), coalesce(p_tags, '{}'))
  returning id into v_id;

  return v_id;
end;
$$;

-- ─── RPC: görüntülenme ───────────────────────────────────────────────────────

create or replace function public.increment_ride_trip_view(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_trips set view_count = view_count + 1
  where id = p_trip_id and status in ('published', 'full', 'in_progress', 'completed');
end;
$$;

-- ─── Admin RPC ───────────────────────────────────────────────────────────────

create or replace function public.get_admin_rides_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'published_trips', (select count(*) from public.ride_trips where status in ('published', 'full')),
    'in_progress', (select count(*) from public.ride_trips where status = 'in_progress'),
    'pending_reservations', (select count(*) from public.ride_reservations where status = 'pending'),
    'open_complaints', (select count(*) from public.ride_complaints where status = 'open'),
    'total_commission_cents', (select coalesce(sum(commission_cents), 0) from public.ride_reservations where status = 'completed')
  );
end;
$$;

create or replace function public.admin_list_ride_trips(p_limit int default 50)
returns table (
  id uuid,
  driver_id uuid,
  from_city_id text,
  to_city_id text,
  status public.ride_trip_status,
  departure_date date,
  contribution_cents int,
  available_seats int,
  seats_total int,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.driver_id, t.from_city_id, t.to_city_id, t.status,
         t.departure_date, t.contribution_cents, t.available_seats, t.seats_total, t.created_at
  from public.ride_trips t
  where public.is_moderator()
  order by t.created_at desc
  limit greatest(p_limit, 1);
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.ride_license_verifications enable row level security;
alter table public.ride_vehicles enable row level security;
alter table public.ride_trips enable row level security;
alter table public.ride_trip_stops enable row level security;
alter table public.ride_reservations enable row level security;
alter table public.ride_reviews enable row level security;
alter table public.ride_favorites enable row level security;
alter table public.ride_live_locations enable row level security;
alter table public.ride_trip_conversations enable row level security;
alter table public.ride_complaints enable row level security;

create policy ride_vehicles_read on public.ride_vehicles for select using (
  user_id = auth.uid() or public.is_moderator()
  or (verification_status = 'approved' and is_active = true)
);

create policy ride_vehicles_write on public.ride_vehicles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ride_trips_read on public.ride_trips for select using (
  status in ('published', 'full', 'in_progress', 'completed')
  or driver_id = auth.uid()
  or public.is_moderator()
  or exists (
    select 1 from public.ride_reservations r
    where r.trip_id = ride_trips.id and r.passenger_id = auth.uid()
  )
);

create policy ride_trips_insert on public.ride_trips for insert with check (driver_id = auth.uid());
create policy ride_trips_update on public.ride_trips for update using (driver_id = auth.uid() or public.is_moderator());

create policy ride_stops_read on public.ride_trip_stops for select using (true);
create policy ride_stops_write on public.ride_trip_stops for all using (
  exists (select 1 from public.ride_trips t where t.id = trip_id and t.driver_id = auth.uid())
);

create policy ride_reservations_read on public.ride_reservations for select using (
  passenger_id = auth.uid()
  or exists (select 1 from public.ride_trips t where t.id = trip_id and t.driver_id = auth.uid())
  or public.is_moderator()
);

create policy ride_reservations_insert on public.ride_reservations for insert with check (passenger_id = auth.uid());

create policy ride_reviews_read on public.ride_reviews for select using (true);
create policy ride_favorites_own on public.ride_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ride_live_read on public.ride_live_locations for select using (
  driver_id = auth.uid()
  or exists (
    select 1 from public.ride_reservations r
    where r.trip_id = ride_live_locations.trip_id and r.passenger_id = auth.uid() and r.status = 'approved'
  )
  or public.is_moderator()
);

create policy ride_trip_conv_read on public.ride_trip_conversations for select using (
  exists (select 1 from public.ride_trips t where t.id = trip_id and t.driver_id = auth.uid())
  or exists (select 1 from public.ride_reservations r where r.trip_id = trip_id and r.passenger_id = auth.uid())
  or public.is_moderator()
);

create policy ride_complaints_insert on public.ride_complaints for insert with check (reporter_id = auth.uid());
create policy ride_complaints_read on public.ride_complaints for select using (reporter_id = auth.uid() or public.is_moderator());
create policy ride_license_own on public.ride_license_verifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Storage ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ride-vehicles', 'ride-vehicles', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy ride_vehicles_storage_read on storage.objects for select using (bucket_id = 'ride-vehicles');
create policy ride_vehicles_storage_insert on storage.objects for insert with check (
  bucket_id = 'ride-vehicles' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy ride_vehicles_storage_delete on storage.objects for delete using (
  bucket_id = 'ride-vehicles' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ─── Bildirim tipleri ────────────────────────────────────────────────────────

alter type public.notification_event_type add value if not exists 'ride_reservation_new';
alter type public.notification_event_type add value if not exists 'ride_reservation_approved';
alter type public.notification_event_type add value if not exists 'ride_reservation_rejected';
alter type public.notification_event_type add value if not exists 'ride_trip_cancelled';
alter type public.notification_event_type add value if not exists 'ride_trip_started';
alter type public.notification_event_type add value if not exists 'ride_trip_completed';
alter type public.notification_event_type add value if not exists 'ride_trip_starting_soon';
alter type public.notification_event_type add value if not exists 'ride_live_location_shared';

-- ─── Feature flag ────────────────────────────────────────────────────────────

insert into public.app_feature_flags (feature_id, label, feature_group)
values ('rides', 'Paylaşımlı Yolculuk', 'centers')
on conflict (feature_id) do nothing;

-- ─── Grants ──────────────────────────────────────────────────────────────────

grant execute on function public.search_ride_trips(text, text, text, date, int, boolean, boolean, boolean, int, text, int, int) to authenticated, anon;
grant execute on function public.request_ride_reservation(uuid, int, text, uuid) to authenticated;
grant execute on function public.respond_ride_reservation(uuid, boolean) to authenticated;
grant execute on function public.ensure_ride_trip_conversation(uuid) to authenticated;
grant execute on function public.start_ride_trip(uuid) to authenticated;
grant execute on function public.complete_ride_trip(uuid) to authenticated;
grant execute on function public.cancel_ride_trip(uuid, text) to authenticated;
grant execute on function public.upsert_ride_live_location(uuid, double precision, double precision, double precision, text, int) to authenticated;
grant execute on function public.submit_ride_review(uuid, int, text, text[]) to authenticated;
grant execute on function public.increment_ride_trip_view(uuid) to authenticated, anon;
grant execute on function public.get_admin_rides_summary() to authenticated;
grant execute on function public.admin_list_ride_trips(int) to authenticated;
