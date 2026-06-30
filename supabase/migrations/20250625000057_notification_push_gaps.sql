-- Push bildirimi eksikleri: marketplace, yolculuk iptal/süre dolumu, canlı konum, heyet açılışı

-- ─── Marketplace: inbox + push ─────────────────────────────────────────────

create or replace function public.notify_marketplace_user(
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
  if p_user_id is null then
    return;
  end if;

  if not coalesce(
    (select (notification_prefs->>'marketplace')::boolean from public.profiles where id = p_user_id),
    true
  ) then
    return;
  end if;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, left(p_body, 180), p_data, p_actor_id);

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, left(p_body, 180), p_data, p_actor_id);
end;
$$;

-- ─── Yolculuk iptali (sürücü) ───────────────────────────────────────────────

create or replace function public.cancel_ride_trip(p_trip_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_res public.ride_reservations;
  v_body text := coalesce(nullif(trim(p_reason), ''), 'Sürücü yolculuğu iptal etti');
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

  for v_res in
    select * from public.ride_reservations
    where trip_id = p_trip_id and status in ('pending', 'approved')
  loop
    update public.ride_reservations
    set status = 'cancelled', payment_status = 'refunded', cancelled_at = now(), updated_at = now()
    where id = v_res.id;

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_trip_cancelled',
      'Yolculuk iptal edildi',
      v_body,
      public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
        'reservation_id', v_res.id,
        'action_hint', 'İade talebi',
        'section_label', 'Yolculuk detayı'
      )),
      auth.uid()
    );
  end loop;

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

-- ─── Yolculuk süre dolumu (cron) ───────────────────────────────────────────

create or replace function public.expire_past_ride_trips()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_res record;
  v_count int := 0;
  v_route text;
begin
  for v_trip in
    select id, driver_id, from_city_id, to_city_id
    from public.ride_trips
    where status in ('published', 'full', 'draft')
      and public.ride_trip_departure_istanbul(departure_date, departure_time) <= now()
  loop
    update public.ride_trips
    set status = 'cancelled',
        cancellation_reason = 'Kalkış zamanı geçti',
        updated_at = now()
    where id = v_trip.id;

    v_route := public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id);

    for v_res in
      select *
      from public.ride_reservations
      where trip_id = v_trip.id
        and status in ('pending', 'approved')
    loop
      update public.ride_reservations
      set status = 'cancelled',
          cancelled_at = now(),
          payment_status = case
            when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
            when v_res.payment_status = 'pending' then 'failed'::public.ride_payment_status
            else v_res.payment_status
          end,
          updated_at = now()
      where id = v_res.id;

      perform public.notify_ride_user(
        v_res.passenger_id,
        'ride_trip_cancelled',
        'Yolculuk süresi doldu',
        v_route || ' · Kalkış zamanı geçtiği için yolculuk otomatik kapatıldı',
        public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
          'reservation_id', v_res.id,
          'expired', true,
          'action_hint', 'İade talebi',
          'section_label', 'Yolculuk detayı'
        )),
        v_trip.driver_id
      );
    end loop;

    perform public.notify_ride_user(
      v_trip.driver_id,
      'ride_trip_cancelled',
      'Yolculuk süresi doldu',
      v_route || ' · Kalkış zamanı geçti — ilan listeden kaldırıldı',
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'expired', true,
        'action_hint', 'Yolculuklarım',
        'section_label', 'Paylaşımlı Yolculuk → Yolculuklarım'
      )),
      null
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── Yolcu rezervasyon iptali → sürücüye push ──────────────────────────────

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

  update public.ride_reservations
  set status = 'cancelled',
      cancelled_at = now(),
      payment_status = case
        when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
        else v_res.payment_status
      end,
      updated_at = now()
  where id = p_reservation_id;

  if v_res.status = 'approved' then
    update public.ride_trips
    set available_seats = available_seats + v_res.seat_count,
        status = case when status = 'full' then 'published'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;
  end if;

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_reservation_rejected',
    'Rezervasyon iptal edildi',
    public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id)
      || ' · Yolcu rezervasyonunu iptal etti',
    public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
      'reservation_id', p_reservation_id,
      'cancelled_by_passenger', true,
      'action_hint', 'Yolculuk detayı',
      'section_label', 'Paylaşımlı Yolculuk → Yolculuklarım'
    )),
    auth.uid()
  );
end;
$$;

-- ─── Canlı konum: ilk paylaşımda yolculara push ────────────────────────────

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
declare
  v_first_share boolean;
  v_passenger_id uuid;
  v_driver_id uuid := auth.uid();
begin
  if v_driver_id is null then raise exception 'Oturum gerekli'; end if;

  if not exists (
    select 1 from public.ride_trips
    where id = p_trip_id and driver_id = v_driver_id and status = 'in_progress'
  ) then
    raise exception 'Canlı konum paylaşılamıyor';
  end if;

  v_first_share := not exists (
    select 1 from public.ride_live_locations where trip_id = p_trip_id
  );

  insert into public.ride_live_locations (trip_id, driver_id, latitude, longitude, heading, current_city_id, eta_minutes, updated_at)
  values (p_trip_id, v_driver_id, p_latitude, p_longitude, p_heading, p_current_city_id, p_eta_minutes, now())
  on conflict (trip_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    heading = excluded.heading,
    current_city_id = excluded.current_city_id,
    eta_minutes = excluded.eta_minutes,
    updated_at = now();

  if v_first_share then
    for v_passenger_id in
      select passenger_id from public.ride_reservations
      where trip_id = p_trip_id and status = 'approved'
    loop
      perform public.notify_ride_user(
        v_passenger_id,
        'ride_live_location_shared',
        'Canlı konum paylaşılıyor',
        'Sürücü konumunu haritada takip edebilirsiniz',
        public._ride_trip_notification_payload(p_trip_id, jsonb_build_object(
          'action_hint', 'Haritayı aç',
          'section_label', 'Yolculuk detayı'
        )),
        v_driver_id
      );
    end loop;
  end if;
end;
$$;

-- ─── Heyet açılışı: taraflara sistem bildirimi + push ──────────────────────

create or replace function public.admin_open_heyet(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_existing public.heyet_cases%rowtype;
  v_party_a uuid;
  v_party_b uuid;
  v_title text;
  v_conversation_id uuid;
  v_welcome text;
  v_deep_link text;
begin
  if v_admin_id is null then
    raise exception 'Oturum gerekli';
  end if;
  if not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_existing
  from public.heyet_cases
  where subject_type = p_subject_type
    and subject_id = p_subject_id;

  if found then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_existing.conversation_id, v_admin_id, 'member')
    on conflict do nothing;
    return v_existing.conversation_id;
  end if;

  select r.party_a_id, r.party_b_id, r.title
  into v_party_a, v_party_b, v_title
  from public.resolve_heyet_subject(p_subject_type, p_subject_id) r;

  if v_party_a is null or v_party_b is null then
    raise exception 'Kayıt bulunamadı veya taraflar çözülemedi';
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_admin_id)
  returning id into v_conversation_id;

  v_deep_link := '/chat/' || v_conversation_id::text;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (v_conversation_id, v_admin_id, 'founder'),
    (v_conversation_id, v_party_a, 'member'),
    (v_conversation_id, v_party_b, 'member')
  on conflict do nothing;

  insert into public.heyet_cases (
    conversation_id,
    subject_type,
    subject_id,
    party_a_id,
    party_b_id,
    opened_by,
    status
  )
  values (
    v_conversation_id,
    p_subject_type,
    p_subject_id,
    v_party_a,
    v_party_b,
    v_admin_id,
    'open'
  );

  v_welcome :=
    'Vora Heyet oturumu başlatıldı. Her iki taraf da yaşanan sorunu, kanıtları ve taleplerinizi burada paylaşabilirsiniz. '
    || 'İnceleme sonrası karar bu sohbette açıklanacaktır.';

  insert into public.messages (conversation_id, sender_id, content, message_type)
  values (v_conversation_id, v_admin_id, v_welcome, 'text');

  perform public.notify_user_system(
    v_party_a,
    'Heyet oturumu açıldı',
    v_title || ' · Vora Heyet incelemesi başladı. Sohbete katılın.',
    jsonb_build_object(
      'deep_link', v_deep_link,
      'conversation_id', v_conversation_id,
      'heyet_subject_type', p_subject_type,
      'heyet_subject_id', p_subject_id
    ),
    'high',
    v_admin_id
  );

  perform public.notify_user_system(
    v_party_b,
    'Heyet oturumu açıldı',
    v_title || ' · Vora Heyet incelemesi başladı. Sohbete katılın.',
    jsonb_build_object(
      'deep_link', v_deep_link,
      'conversation_id', v_conversation_id,
      'heyet_subject_type', p_subject_type,
      'heyet_subject_id', p_subject_id
    ),
    'high',
    v_admin_id
  );

  return v_conversation_id;
end;
$$;

notify pgrst, 'reload schema';
