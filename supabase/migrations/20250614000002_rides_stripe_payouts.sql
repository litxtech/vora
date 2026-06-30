-- Paylaşımlı Yolculuk — Stripe escrow, sürücü ödemesi, admin doğrulama, hatırlatıcılar

alter type public.revenue_type add value if not exists 'rides_commission';

alter type public.notification_event_type add value if not exists 'ride_reservation_paid';
alter type public.notification_event_type add value if not exists 'ride_payout_due';
alter type public.notification_event_type add value if not exists 'ride_payout_completed';

-- Rezervasyon ödeme alanları
alter table public.ride_reservations
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists payout_due_at timestamptz,
  add column if not exists payout_completed_at timestamptz,
  add column if not exists payout_reference text,
  add column if not exists payout_completed_by uuid references public.profiles (id) on delete set null,
  add column if not exists refunded_at timestamptz;

create index if not exists ride_reservations_stripe_session_idx
  on public.ride_reservations (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists ride_reservations_payout_due_idx
  on public.ride_reservations (payout_due_at)
  where status = 'completed' and payment_status = 'released' and payout_completed_at is null;

-- ─── Rezervasyon talebi (ödeme öncesi) ───────────────────────────────────────

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
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.status not in ('published', 'full') then raise exception 'Bu yolculuk rezervasyona kapalı'; end if;
  if v_trip.driver_id = auth.uid() then raise exception 'Kendi yolculuğunuza rezervasyon yapamazsınız'; end if;
  if p_seat_count < 1 or p_seat_count > v_trip.available_seats then raise exception 'Yeterli boş koltuk yok'; end if;

  if v_trip.women_only then
    select gender into v_gender from public.profiles where id = auth.uid();
    if v_gender is distinct from 'female' then raise exception 'Bu yolculuk yalnızca kadın yolcular içindir'; end if;
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
    trip_id, passenger_id, seat_count, amount_cents, commission_cents, driver_payout_cents,
    passenger_note, pickup_stop_id, payment_status
  )
  values (
    p_trip_id, auth.uid(), p_seat_count, v_amount, v_commission, v_payout,
    nullif(trim(coalesce(p_passenger_note, '')), ''), p_pickup_stop_id, 'pending'
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

-- ─── Stripe ödeme tamamlama ──────────────────────────────────────────────────

create or replace function public.fulfill_ride_reservation_payment(
  p_reservation_id uuid,
  p_passenger_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return null; end if;
  if v_res.passenger_id <> p_passenger_id then return null; end if;
  if v_res.payment_status <> 'pending' then return null; end if;
  if v_res.status not in ('pending', 'cancelled') then
    -- cancelled stale checkout — reactivate as pending
    if v_res.status = 'cancelled' then
      update public.ride_reservations set status = 'pending' where id = p_reservation_id;
    elsif v_res.status <> 'pending' then
      return null;
    end if;
  end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;
  if v_trip.status not in ('published', 'full') then return null; end if;

  update public.ride_reservations
  set payment_status = 'held',
      stripe_checkout_session_id = p_session_id,
      stripe_payment_intent_id = p_payment_intent_id,
      paid_at = now(),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_reservation_new',
    'Yeni rezervasyon talebi',
    v_res.seat_count || ' koltuk · ödeme alındı',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    p_passenger_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    p_passenger_id,
    'ride_reservation_paid',
    'Katkı payınız alındı',
    'Rezervasyonunuz sürücü onayı bekliyor',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    v_trip.driver_id
  );

  return p_reservation_id;
end;
$$;

-- ─── Rezervasyon onayı (ödeme şart) ──────────────────────────────────────────

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
    set status = 'rejected', updated_at = now()
    where id = p_reservation_id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_reservation_rejected', 'Rezervasyon reddedildi',
      'Yolculuk rezervasyonunuz reddedildi — iade işlemi başlatılacak',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  end if;
end;
$$;

-- ─── Yolculuk tamamlama → sürücü ödemesi planla ─────────────────────────────

create or replace function public.complete_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_passenger_id uuid;
  v_res record;
  v_due timestamptz := now() + interval '3 days';
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  update public.ride_trips
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_trip_id;

  for v_res in
    select id, passenger_id, driver_payout_cents
    from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved'
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
      v_res.passenger_id, 'ride_trip_completed', 'Yolculuk tamamlandı',
      'Deneyiminizi puanlayın',
      jsonb_build_object('trip_id', p_trip_id, 'reservation_id', v_res.id),
      auth.uid()
    );
  end loop;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    v_trip.driver_id, 'ride_payout_due', 'Kazanç planlandı',
    'Onaylı yolculuklar tamamlandı — ödeme 3 gün içinde',
    jsonb_build_object('trip_id', p_trip_id),
    auth.uid()
  where exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'completed' and payout_completed_at is null
  );

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

-- ─── Admin: sürücü ödemesi işaretle ──────────────────────────────────────────

create or replace function public.admin_mark_ride_payout(
  p_reservation_id uuid,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  if not public.is_moderator() then return jsonb_build_object('error', 'Yetkisiz'); end if;

  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return jsonb_build_object('error', 'Rezervasyon bulunamadı'); end if;
  if v_res.status <> 'completed' or v_res.payment_status <> 'released' then
    return jsonb_build_object('error', 'Ödeme bu aşamada yapılamaz');
  end if;
  if v_res.payout_completed_at is not null then return jsonb_build_object('error', 'Zaten ödendi'); end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;

  update public.ride_reservations
  set payout_completed_at = now(),
      payout_reference = nullif(trim(p_reference), ''),
      payout_completed_by = auth.uid(),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
  values (
    'rides_commission'::public.revenue_type,
    v_res.commission_cents / 100.0,
    'TRY',
    v_res.id,
    v_trip.from_city_id || '→' || v_trip.to_city_id,
    'Paylaşımlı yolculuk %10 komisyon'
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id, 'ride_payout_completed', 'Kazanç yatırıldı',
    '₺' || (v_res.driver_payout_cents / 100.0)::text || ' hesabınıza aktarıldı',
    jsonb_build_object('reservation_id', p_reservation_id, 'trip_id', v_trip.id),
    null
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Admin: rezervasyon iadesi ───────────────────────────────────────────────

create or replace function public.admin_mark_ride_reservation_refunded(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Rezervasyon bulunamadı'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;

  if v_res.status = 'approved' then
    update public.ride_trips
    set available_seats = least(seats_total, available_seats + v_res.seat_count),
        status = case when status = 'full' then 'published'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;
  end if;

  update public.ride_reservations
  set status = 'cancelled',
      payment_status = 'refunded',
      refunded_at = now(),
      cancelled_at = now(),
      updated_at = now()
  where id = p_reservation_id;
end;
$$;

-- Stripe iade RPC genişletmesi
create or replace function public.admin_get_stripe_payment_for_refund(
  p_payment_type text,
  p_record_id uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    select jsonb_build_object(
      'stripe_payment_intent_id', c.stripe_payment_intent_id,
      'status', c.status,
      'amount_cents', c.amount_cents,
      'username', p.username
    )
    into v_result
    from public.platform_contributions c
    join public.profiles p on p.id = c.user_id
    where c.id = p_record_id;
  elsif p_payment_type = 'event_ticket' then
    select jsonb_build_object(
      'stripe_payment_intent_id', t.stripe_payment_intent_id,
      'status', t.status,
      'amount_cents', t.amount_cents,
      'username', p.username
    )
    into v_result
    from public.event_tickets t
    join public.profiles p on p.id = t.user_id
    where t.id = p_record_id;
  elsif p_payment_type = 'marketplace_order' then
    select jsonb_build_object(
      'stripe_payment_intent_id', o.stripe_payment_intent_id,
      'status', o.status,
      'amount_cents', o.gross_amount_cents,
      'username', p.username
    )
    into v_result
    from public.marketplace_orders o
    join public.profiles p on p.id = o.buyer_id
    where o.id = p_record_id;
  elsif p_payment_type = 'ride_reservation' then
    select jsonb_build_object(
      'stripe_payment_intent_id', r.stripe_payment_intent_id,
      'status', r.payment_status,
      'amount_cents', r.amount_cents,
      'username', p.username
    )
    into v_result
    from public.ride_reservations r
    join public.profiles p on p.id = r.passenger_id
    where r.id = p_record_id;
  else
    raise exception 'Geçersiz ödeme türü';
  end if;

  if v_result is null then raise exception 'Ödeme kaydı bulunamadı'; end if;
  return v_result;
end; $$;

create or replace function public.admin_mark_stripe_payment_refunded(
  p_payment_type text,
  p_record_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    update public.platform_contributions set status = 'refunded'
    where id = p_record_id and status = 'completed';
    if not found then raise exception 'İade edilebilir katkı bulunamadı'; end if;
    delete from public.user_badges
    where user_id = (select user_id from public.platform_contributions where id = p_record_id)
      and badge_type = 'platform_supporter';
  elsif p_payment_type = 'event_ticket' then
    update public.event_tickets set status = 'refunded'
    where id = p_record_id and status = 'paid';
    if not found then raise exception 'İade edilebilir bilet bulunamadı'; end if;
  elsif p_payment_type = 'marketplace_order' then
    perform public.admin_marketplace_order_refunded(p_record_id);
  elsif p_payment_type = 'ride_reservation' then
    perform public.admin_mark_ride_reservation_refunded(p_record_id);
  else
    raise exception 'Geçersiz ödeme türü';
  end if;
end; $$;

-- ─── Yolculuk hatırlatıcı (1 saat önce) ─────────────────────────────────────

create or replace function public.process_ride_trip_starting_soon_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_count int := 0;
  v_passenger_id uuid;
begin
  for v_trip in
    select t.id, t.driver_id, t.from_city_id, t.to_city_id, t.departure_date, t.departure_time
    from public.ride_trips t
    where t.status in ('published', 'full')
      and (t.departure_date + t.departure_time)::timestamptz between now() + interval '55 minutes' and now() + interval '65 minutes'
  loop
    for v_passenger_id in
      select passenger_id from public.ride_reservations
      where trip_id = v_trip.id and status = 'approved'
    loop
      if not exists (
        select 1 from public.notifications n
        where n.user_id = v_passenger_id
          and n.event_type = 'ride_trip_starting_soon'
          and n.data->>'trip_id' = v_trip.id::text
          and n.created_at > now() - interval '2 hours'
      ) then
        insert into public.notifications (user_id, event_type, title, body, data, actor_id)
        values (
          v_passenger_id,
          'ride_trip_starting_soon',
          'Yolculuk başlamak üzere',
          v_trip.from_city_id || ' → ' || v_trip.to_city_id || ' · 1 saat içinde',
          jsonb_build_object('trip_id', v_trip.id),
          v_trip.driver_id
        );
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- ─── Ehliyet / araç admin doğrulama ──────────────────────────────────────────

create or replace function public.admin_list_ride_license_verifications(p_limit int default 30)
returns table (
  id uuid,
  user_id uuid,
  status public.ride_license_verification_status,
  created_at timestamptz,
  username text,
  full_name text
)
language sql stable security definer set search_path = public as $$
  select v.id, v.user_id, v.status, v.created_at, p.username, p.full_name
  from public.ride_license_verifications v
  join public.profiles p on p.id = v.user_id
  where public.is_moderator() and v.status = 'pending'
  order by v.created_at asc
  limit greatest(p_limit, 1);
$$;

create or replace function public.admin_verify_ride_license(
  p_verification_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.ride_license_verifications
  set status = case when p_approve then 'approved'::public.ride_license_verification_status else 'rejected'::public.ride_license_verification_status end,
      rejection_reason = case when p_approve then null else p_reason end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_verification_id and status = 'pending';
  if not found then raise exception 'Kayıt bulunamadı'; end if;
end;
$$;

create or replace function public.admin_verify_ride_vehicle(
  p_vehicle_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.ride_vehicles
  set verification_status = case when p_approve then 'approved'::public.ride_vehicle_verification_status else 'rejected'::public.ride_vehicle_verification_status end,
      rejection_reason = case when p_approve then null else p_reason end,
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = p_vehicle_id and verification_status = 'pending';
  if not found then raise exception 'Araç bulunamadı'; end if;
end;
$$;

-- Admin özet güncelle
create or replace function public.get_admin_rides_summary()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'published_trips', (select count(*) from public.ride_trips where status in ('published', 'full')),
    'in_progress', (select count(*) from public.ride_trips where status = 'in_progress'),
    'pending_reservations', (select count(*) from public.ride_reservations where status = 'pending' and payment_status = 'held'),
    'open_complaints', (select count(*) from public.ride_complaints where status = 'open'),
    'total_commission_cents', (select coalesce(sum(commission_cents), 0) from public.ride_reservations where payout_completed_at is not null),
    'escrow_cents', (select coalesce(sum(amount_cents), 0) from public.ride_reservations where payment_status = 'held' and status in ('pending', 'approved')),
    'payout_due', (select count(*) from public.ride_reservations where status = 'completed' and payment_status = 'released' and payout_completed_at is null),
    'pending_licenses', (select count(*) from public.ride_license_verifications where status = 'pending'),
    'pending_vehicles', (select count(*) from public.ride_vehicles where verification_status = 'pending')
  );
end;
$$;

create or replace function public.admin_list_ride_reservations(p_limit int default 50)
returns table (
  id uuid,
  trip_id uuid,
  passenger_id uuid,
  driver_id uuid,
  seat_count int,
  amount_cents int,
  driver_payout_cents int,
  status public.ride_reservation_status,
  payment_status public.ride_payment_status,
  payout_due_at timestamptz,
  payout_completed_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    r.id, r.trip_id, r.passenger_id, t.driver_id,
    r.seat_count, r.amount_cents, r.driver_payout_cents,
    r.status, r.payment_status, r.payout_due_at, r.payout_completed_at, r.created_at
  from public.ride_reservations r
  join public.ride_trips t on t.id = r.trip_id
  where public.is_moderator()
  order by r.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.fulfill_ride_reservation_payment(uuid, uuid, text, text, int) to service_role;
grant execute on function public.admin_mark_ride_payout(uuid, text) to authenticated;
grant execute on function public.admin_mark_ride_reservation_refunded(uuid) to authenticated;
grant execute on function public.process_ride_trip_starting_soon_notifications() to service_role;
grant execute on function public.admin_list_ride_license_verifications(int) to authenticated;
grant execute on function public.admin_verify_ride_license(uuid, boolean, text) to authenticated;
grant execute on function public.admin_verify_ride_vehicle(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_ride_reservations(int) to authenticated;

-- Yolculuk hatırlatıcı cron (pg_cron varsa, 15 dk)
do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-ride-trip-starting-soon');
  perform cron.schedule(
    'process-ride-trip-starting-soon',
    '*/15 * * * *',
    $$select public.process_ride_trip_starting_soon_notifications();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; ride starting soon manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;
