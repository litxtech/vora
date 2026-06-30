-- Yolculuk iade/iptal bildirimleri: sürücü ≠ yolcu, trip sohbet üyeliği, admin önizleme

alter type public.notification_event_type add value if not exists 'ride_passenger_cancelled_reservation';

-- Admin canlı destek bildiriminde billing/iade metnini kısalt (push'ta üçüncü taraf detayı gösterme)
create or replace function public.live_support_admin_notification_body(
  p_topic text,
  p_content text,
  p_message_type text
)
returns text
language sql
immutable
as $$
  select case
    when p_topic = 'billing'
      or position('iade' in lower(coalesce(p_content, ''))) > 0
      or position('yolculuk iade' in lower(coalesce(p_content, ''))) > 0 then
      'Ödeme / yolculuk konusunda yeni destek mesajı — panelden açın'
    else public.live_support_message_preview(p_content, p_message_type)
  end;
$$;

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

  delete from public.conversation_members cm
  where cm.conversation_id = p_conversation_id
    and cm.user_id <> v_driver_id
    and not exists (
      select 1
      from public.ride_reservations rr
      where rr.trip_id = v_trip_id
        and rr.passenger_id = cm.user_id
        and rr.status = 'approved'
    );

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

create or replace function public.on_live_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.live_support_threads%rowtype;
  v_sender_role text;
  v_preview text;
  v_notify_body text;
  v_admin_body text;
begin
  select * into v_thread
  from public.live_support_threads
  where id = new.thread_id;

  if not found then
    return new;
  end if;

  select role into v_sender_role
  from public.profiles
  where id = new.sender_id;

  v_preview := public.live_support_message_preview(new.content, new.message_type);
  v_admin_body := public.live_support_admin_notification_body(
    v_thread.topic,
    new.content,
    new.message_type
  );

  if v_sender_role in ('moderator', 'admin', 'super_admin') then
    update public.live_support_threads
    set
      status = 'waiting_user',
      user_unread_count = user_unread_count + 1,
      support_unread_count = 0,
      assigned_admin_id = coalesce(assigned_admin_id, new.sender_id),
      last_message_at = new.created_at,
      last_message_preview = v_preview,
      session_expires_at = null,
      updated_at = now(),
      resolved_at = null
    where id = new.thread_id;

    v_notify_body := case
      when new.message_type = 'image' and char_length(trim(coalesce(new.content, ''))) = 0 then
        'Destek ekibinden görsel yanıt geldi. Sohbeti açarak inceleyebilirsiniz.'
      when new.message_type = 'image' then
        left(trim(new.content), 200)
      else
        v_preview
    end;

    perform public.notify_user_system(
      v_thread.user_id,
      'Canlı destek yanıtı',
      v_notify_body,
      jsonb_build_object(
        'kind', 'live_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id
      ),
      'high',
      new.sender_id
    );
  else
    update public.live_support_threads
    set
      status = 'waiting_support',
      support_unread_count = support_unread_count + 1,
      user_unread_count = 0,
      last_message_at = new.created_at,
      last_message_preview = v_preview,
      session_expires_at = now() + interval '5 minutes',
      updated_at = now(),
      resolved_at = null
    where id = new.thread_id;

    perform public.notify_admins_live_support(
      'Yeni canlı destek mesajı',
      v_admin_body,
      jsonb_build_object(
        'kind', 'live_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id,
        'user_id', v_thread.user_id,
        'topic', v_thread.topic
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.start_live_support_thread(
  p_message text default '',
  p_topic text default null,
  p_subject text default 'Canlı Destek',
  p_message_type text default 'text',
  p_media_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
  v_admin_body text;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_message_type not in ('text', 'image', 'video') then
    raise exception 'Geçersiz mesaj türü';
  end if;

  if p_message_type = 'text' and char_length(trim(p_message)) < 2 then
    raise exception 'Mesaj en az 2 karakter olmalıdır';
  end if;

  if p_message_type in ('image', 'video') and p_media_url is null then
    raise exception 'Medya bulunamadı';
  end if;

  if p_topic is not null and p_topic not in (
    'account', 'billing', 'technical', 'general', 'app_bug', 'report', 'other'
  ) then
    raise exception 'Geçersiz konu';
  end if;

  v_admin_body := public.live_support_admin_notification_body(
    p_topic,
    p_message,
    p_message_type
  );

  select id into v_thread_id
  from public.live_support_threads
  where user_id = v_user_id;

  if v_thread_id is null then
    insert into public.live_support_threads (user_id, subject, topic)
    values (v_user_id, trim(p_subject), p_topic)
    returning id into v_thread_id;

    perform public.notify_admins_live_support(
      'Yeni canlı destek sohbeti',
      v_admin_body,
      jsonb_build_object(
        'kind', 'live_support_started',
        'thread_id', v_thread_id,
        'user_id', v_user_id,
        'topic', p_topic
      )
    );
  else
    update public.live_support_threads
    set
      topic = coalesce(p_topic, topic),
      subject = case
        when status in ('resolved', 'closed', 'no_response') then trim(p_subject)
        else subject
      end,
      updated_at = now()
    where id = v_thread_id;
  end if;

  insert into public.live_support_messages (
    thread_id, sender_id, content, message_type, media_url
  )
  values (
    v_thread_id,
    v_user_id,
    trim(p_message),
    p_message_type,
    p_media_url
  );

  perform public.notify_user_system(
    v_user_id,
    'Canlı destek talebiniz alındı',
    'Destek ekibimiz en geç 5 dakika içinde yanıt verecek. Yanıt geldiğinde bildirim alırsınız.',
    jsonb_build_object('kind', 'live_support_started', 'thread_id', v_thread_id),
    'normal'
  );

  return v_thread_id;
end;
$$;

create or replace function public.cancel_passenger_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
  v_conversation_id uuid;
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

  select conversation_id into v_conversation_id
  from public.ride_trip_conversations
  where trip_id = v_trip.id;

  if v_conversation_id is not null then
    perform public.sync_ride_trip_conversation_members(v_conversation_id);
  end if;

  perform public.notify_ride_user(
    v_trip.driver_id,
    'ride_passenger_cancelled_reservation',
    'Yolcu rezervasyonu iptal etti',
    public._ride_trip_route_label(v_trip.from_city_id, v_trip.to_city_id)
      || ' · Rezervasyon iptal edildi, koltuk tekrar açıldı',
    public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
      'reservation_id', p_reservation_id,
      'cancelled_by_passenger', true,
      'audience', 'driver',
      'refund_eligible', false,
      'action_hint', 'Yolculuk detayı',
      'section_label', 'Paylaşımlı Yolculuk → Yolculuklarım'
    )),
    auth.uid()
  );
end;
$$;

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
  v_amount_label text;
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

    v_amount_label := '₺' || trim(to_char(v_res.amount_cents / 100.0, 'FM999999990.00'));

    perform public.notify_ride_user(
      v_res.passenger_id,
      'ride_reservation_approved',
      'Rezervasyon onaylandı',
      case
        when v_res.payment_status = 'held' then
          v_amount_label || ' katkı payı tahsil edildi. Yolculuk rezervasyonunuz onaylandı.'
        else 'Yolculuk rezervasyonunuz onaylandı'
      end,
      jsonb_build_object(
        'trip_id', v_trip.id,
        'reservation_id', p_reservation_id,
        'amount_cents', v_res.amount_cents,
        'audience', 'passenger',
        'refund_eligible', false
      ),
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
      public._ride_trip_notification_payload(v_trip.id, jsonb_build_object(
        'reservation_id', p_reservation_id,
        'audience', 'passenger',
        'refund_eligible', true,
        'action_hint', 'İade talebi'
      )),
      auth.uid()
    );
  end if;
end;
$$;
