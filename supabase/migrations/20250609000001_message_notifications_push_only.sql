-- Mesaj bildirimleri yalnızca push (notification_outbox) üzerinden gider;
-- bildirim kutusunda (notifications) görünmez.

delete from public.notifications
where event_type in ('message', 'group_message');

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
