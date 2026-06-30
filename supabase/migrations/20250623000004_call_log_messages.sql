-- Arama kayıtları sohbet zaman çizelgesinde görünsün; arama mesajı push üretmesin.

alter type public.message_type add value if not exists 'call';

create or replace function public.find_direct_conversation(p_user_a uuid, p_user_b uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.conversations c
  where c.type = 'direct'
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_user_a
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_user_b
    )
  limit 1;
$$;

create or replace function public.log_call_session_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_content text;
  v_duration_sec integer := 0;
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  if new.status not in ('ended', 'missed', 'declined', 'cancelled') then
    return new;
  end if;

  v_conversation_id := public.find_direct_conversation(new.caller_id, new.callee_id);
  if v_conversation_id is null then
    return new;
  end if;

  if new.started_at is not null and new.ended_at is not null then
    v_duration_sec := greatest(
      0,
      floor(extract(epoch from (new.ended_at::timestamptz - new.started_at::timestamptz)))::integer
    );
  end if;

  v_content := case new.status
    when 'missed' then case when new.call_type = 'video' then 'Cevapsız görüntülü arama' else 'Cevapsız sesli arama' end
    when 'declined' then case when new.call_type = 'video' then 'Reddedilen görüntülü arama' else 'Reddedilen sesli arama' end
    when 'cancelled' then case when new.call_type = 'video' then 'İptal edilen görüntülü arama' else 'İptal edilen sesli arama' end
    else case when new.call_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end
  end;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    metadata
  )
  values (
    v_conversation_id,
    new.caller_id,
    v_content,
    'call',
    jsonb_build_object(
      'callSessionId', new.id,
      'callType', new.call_type,
      'status', new.status,
      'callerId', new.caller_id,
      'calleeId', new.callee_id,
      'startedAt', new.started_at,
      'endedAt', new.ended_at,
      'durationSec', v_duration_sec
    )
  );

  return new;
end;
$$;

drop trigger if exists call_sessions_log_message on public.call_sessions;
create trigger call_sessions_log_message
  after update on public.call_sessions
  for each row
  execute function public.log_call_session_message();

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
begin
  if new.message_type = 'call' then
    return new;
  end if;

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
      when 'shared_marketplace_listing' then 'İlan paylaştı'
      else new.content
    end,
    180
  );

  v_event := case when v_conv_type = 'group' then 'group_message'::public.notification_event_type
                  else 'message'::public.notification_event_type end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case
      when coalesce((p.messaging_prefs->>'hide_notification_preview')::boolean, false) then 'Yeni mesaj'
      when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview
      else preview
    end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'is_group', v_conv_type = 'group'),
    new.sender_id
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;
