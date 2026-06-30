-- Trip sohbet: üye senkronu + push verisi; aynı hesaptan çift rezervasyon engeli

-- ─── Tek aktif rezervasyon (trip + yolcu) ────────────────────────────────────

create unique index if not exists ride_reservations_one_active_per_passenger_trip
  on public.ride_reservations (trip_id, passenger_id)
  where status in ('pending', 'approved');

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
    passenger_note, pickup_stop_id, payment_status
  )
  values (
    p_trip_id, auth.uid(), p_seat_count, v_amount, v_commission, v_payout,
    nullif(trim(coalesce(p_passenger_note, '')), ''), p_pickup_stop_id, 'pending'
  )
  returning id into v_reservation_id;

  return v_reservation_id;
exception
  when unique_violation then
    raise exception 'Bu yolculuk için zaten aktif bir rezervasyonunuz var';
end;
$$;

-- ─── Trip sohbet üyelerini senkronize et ─────────────────────────────────────

create or replace function public.sync_ride_trip_conversation_members(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_driver_id uuid;
  v_passenger_id uuid;
begin
  select rtc.trip_id, t.driver_id
  into v_trip_id, v_driver_id
  from public.ride_trip_conversations rtc
  join public.ride_trips t on t.id = rtc.trip_id
  where rtc.conversation_id = p_conversation_id;

  if v_trip_id is null then
    return;
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (p_conversation_id, v_driver_id, 'founder')
  on conflict do nothing;

  for v_passenger_id in
    select passenger_id
    from public.ride_reservations
    where trip_id = v_trip_id and status = 'approved'
  loop
    insert into public.conversation_members (conversation_id, user_id, role)
    values (p_conversation_id, v_passenger_id, 'member')
    on conflict do nothing;
  end loop;
end;
$$;

grant execute on function public.sync_ride_trip_conversation_members(uuid) to authenticated, service_role;

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
begin
  select conversation_id into v_conversation_id
  from public.ride_trip_conversations
  where trip_id = p_trip_id;

  if v_conversation_id is not null then
    perform public.sync_ride_trip_conversation_members(v_conversation_id);
    return v_conversation_id;
  end if;

  select * into v_trip from public.ride_trips where id = p_trip_id;
  if not found then
    raise exception 'Yolculuk bulunamadı';
  end if;

  v_title := left(v_trip.from_city_id || ' → ' || v_trip.to_city_id || ' · ' || to_char(v_trip.departure_date, 'DD Mon'), 80);

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_trip.driver_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_trip.driver_id, 'founder');

  insert into public.ride_trip_conversations (trip_id, conversation_id)
  values (p_trip_id, v_conversation_id);

  perform public.sync_ride_trip_conversation_members(v_conversation_id);

  return v_conversation_id;
end;
$$;

-- ─── Mesaj bildirimi: trip sohbet üyeleri + trip_id ─────────────────────────

create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  preview text;
  v_conv_type public.conversation_type;
  v_conv_title text;
  v_event public.notification_event_type;
  v_trip_id uuid;
begin
  perform public.sync_ride_trip_conversation_members(new.conversation_id);

  select rtc.trip_id into v_trip_id
  from public.ride_trip_conversations rtc
  where rtc.conversation_id = new.conversation_id;

  select coalesce(p.full_name, '@' || p.username)
  into sender_name
  from public.profiles p
  where p.id = new.sender_id;

  select c.type, c.title
  into v_conv_type, v_conv_title
  from public.conversations c
  where c.id = new.conversation_id;

  preview := left(
    case new.message_type
      when 'image' then 'Fotoğraf gönderdi'
      when 'video' then 'Video gönderdi'
      when 'audio' then 'Ses kaydı gönderdi'
      when 'location' then 'Konum paylaştı'
      when 'file' then 'Dosya gönderdi'
      when 'shared_post' then 'Gönderi paylaştı'
      when 'shared_reel' then 'Reel paylaştı'
      when 'shared_profile' then 'Profil paylaştı'
      else new.content
    end,
    180
  );

  v_event := case
    when v_conv_type = 'group' then 'group_message'::public.notification_event_type
    else 'message'::public.notification_event_type
  end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case
      when v_trip_id is not null then coalesce(v_conv_title, 'Trip sohbet')
      when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı')
      else coalesce(sender_name, 'Yeni mesaj')
    end,
    case
      when coalesce((p.messaging_prefs->>'hide_notification_preview')::boolean, false) then 'Yeni mesaj'
      when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview
      else preview
    end,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'is_group', v_conv_type = 'group',
      'trip_id', v_trip_id
    ),
    new.sender_id
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;

-- ─── Ride bildirimleri: inbox + push ────────────────────────────────────────

create or replace function public.notify_ride_user(
  p_user_id uuid,
  p_event_type public.notification_event_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
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

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, p_body, p_data, p_actor_id);

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, p_body, p_data, p_actor_id);
end;
$$;

grant execute on function public.notify_ride_user(uuid, public.notification_event_type, text, text, jsonb, uuid) to service_role;

-- Kart kaydı tamamlandığında sürücü + yolcu bildirimi (push dahil)
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

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_reservation_new',
    'Yeni rezervasyon talebi',
    v_res.seat_count || ' koltuk · kart kaydedildi — onaylayın',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    p_passenger_id
  );

  perform public.notify_ride_user(
    p_passenger_id,
    'ride_reservation_paid',
    'Kartınız kaydedildi',
    'Rezervasyonunuz sürücü onayı bekliyor. Ücret yolculuk bitince tahsil edilir.',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    v_trip.driver_id
  );

  return p_reservation_id;
end;
$$;

-- Sürücü onay/red bildirimleri push dahil
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

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_reservation_approved',
      'Rezervasyon onaylandı',
      'Yolculuk rezervasyonunuz onaylandı',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
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
