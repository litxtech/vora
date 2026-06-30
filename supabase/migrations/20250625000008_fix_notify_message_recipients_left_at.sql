-- notify_message_recipients: conversation_members'da left_at yok; mesaj bildirimi düşüyordu.
-- İş başvurusu sırasında shared_job_listing mesajı gönderilirken tetikleniyordu.

create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_avatar text;
  preview text;
  v_conv_type public.conversation_type;
  v_conv_title text;
  v_event public.notification_event_type;
begin
  if new.message_type = 'call' then
    return new;
  end if;

  select coalesce(p.full_name, '@' || p.username), p.avatar_url
  into sender_name, sender_avatar
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
      when 'shared_job_listing' then 'İş ilanı paylaştı'
      when 'shared_staff_listing' then 'Personel talebi paylaştı'
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
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup') else sender_name end,
    preview,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'sender_avatar', sender_avatar
    ),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;
