-- Otel rezervasyonları + uygulama içi Stripe ödeme (Payment Sheet)

alter type public.notification_event_type add value if not exists 'hotel_reservation_paid';
alter type public.notification_event_type add value if not exists 'hotel_reservation_received';
alter type public.notification_event_type add value if not exists 'hotel_reservation_cancelled';

create type public.hotel_reservation_status as enum (
  'pending_payment',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
);

create table public.hotel_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,
  hotel_id uuid not null references public.hotel_listings (id) on delete restrict,
  guest_id uuid not null references public.profiles (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  check_in date not null,
  check_out date not null,
  nights smallint not null check (nights >= 1),
  guests_count smallint not null default 1 check (guests_count between 1 and 8),
  nightly_price_cents integer not null check (nightly_price_cents > 0),
  student_discount_pct smallint not null default 0 check (student_discount_pct between 0 and 70),
  gross_amount_cents integer not null check (gross_amount_cents >= 100),
  commission_rate numeric(5, 4) not null default 0.12,
  commission_cents integer not null,
  owner_payout_cents integer not null,
  currency text not null default 'try',
  guest_note text,
  status public.hotel_reservation_status not null default 'pending_payment',
  payment_status text not null default 'pending',
  stripe_payment_intent_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hotel_reservations_dates_check check (check_out > check_in)
);

create index hotel_reservations_guest_idx on public.hotel_reservations (guest_id, created_at desc);
create index hotel_reservations_owner_idx on public.hotel_reservations (owner_id, created_at desc);
create index hotel_reservations_hotel_idx on public.hotel_reservations (hotel_id, created_at desc);
create index hotel_reservations_status_idx on public.hotel_reservations (status, created_at desc);
create index hotel_reservations_pi_idx on public.hotel_reservations (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table public.hotel_reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.hotel_reservations (id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index hotel_reservation_events_res_idx
  on public.hotel_reservation_events (reservation_id, created_at asc);

create or replace function public.generate_hotel_reservation_code()
returns text
language plpgsql
as $$
begin
  return 'HT-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-'
    || lpad((floor(random() * 10000))::int::text, 4, '0');
end;
$$;

create or replace function public.log_hotel_reservation_event(
  p_reservation_id uuid,
  p_event_type text,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hotel_reservation_events (reservation_id, event_type, actor_id, payload)
  values (p_reservation_id, p_event_type, p_actor_id, coalesce(p_payload, '{}'));
end;
$$;

create or replace function public.notify_hotel_reservation_users(
  p_user_id uuid,
  p_event_type public.notification_event_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}',
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;

  if not coalesce(
    (select (notification_prefs->>'hotels')::boolean from public.profiles where id = p_user_id),
    true
  ) then
    return;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, left(p_body, 180), p_data, p_actor_id);

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    p_user_id,
    p_event_type,
    p_title,
    left(p_body, 180),
    p_data,
    p_actor_id,
    'businesses'::public.notification_category,
    'normal'::public.notification_priority
  );
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
  v_res_id uuid;
  v_code text;
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
    updated_at = now()
  where id = p_reservation_id;

  select name into v_hotel_name from public.hotel_listings where id = v_res.hotel_id;
  select coalesce(username, full_name, 'Misafir') into v_guest_name from public.profiles where id = p_guest_id;

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'payment_confirmed', p_guest_id,
    jsonb_build_object('payment_intent_id', p_payment_intent_id, 'amount_cents', p_amount_cents)
  );

  perform public.notify_hotel_reservation_users(
    p_guest_id,
    'hotel_reservation_paid'::public.notification_event_type,
    'Rezervasyon onaylandı',
    v_hotel_name || ' · ' || v_res.reservation_code,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations'
    ),
    v_res.owner_id
  );

  perform public.notify_hotel_reservation_users(
    v_res.owner_id,
    'hotel_reservation_received'::public.notification_event_type,
    'Yeni rezervasyon',
    v_guest_name || ' · ' || v_hotel_name || ' · ' || v_res.reservation_code,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations'
    ),
    p_guest_id
  );

  return true;
end;
$$;

alter table public.hotel_reservations enable row level security;

create policy hotel_reservations_read on public.hotel_reservations
  for select using (guest_id = auth.uid() or owner_id = auth.uid());

create policy hotel_reservations_insert on public.hotel_reservations
  for insert to authenticated with check (guest_id = auth.uid());

create policy hotel_reservations_update_owner on public.hotel_reservations
  for update to authenticated using (owner_id = auth.uid());

grant execute on function public.create_hotel_reservation_pending to authenticated;
grant execute on function public.fulfill_hotel_reservation_payment to service_role;

alter publication supabase_realtime add table public.hotel_reservations;
