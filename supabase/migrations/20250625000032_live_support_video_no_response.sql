-- Canlı destek: video mesajları + kullanıcı cevap vermedi durumu

alter table public.live_support_threads
  drop constraint if exists live_support_threads_status_check;

alter table public.live_support_threads
  add constraint live_support_threads_status_check
  check (
    status in ('open', 'waiting_user', 'waiting_support', 'resolved', 'closed', 'no_response')
  );

alter table public.live_support_messages
  drop constraint if exists live_support_messages_message_type_check;

alter table public.live_support_messages
  add constraint live_support_messages_message_type_check
  check (message_type in ('text', 'image', 'video'));

alter table public.live_support_messages
  drop constraint if exists live_support_messages_content_check;

alter table public.live_support_messages
  add constraint live_support_messages_content_check
  check (
    (
      message_type in ('image', 'video')
      and media_url is not null
      and char_length(trim(content)) <= 2000
    )
    or (
      message_type = 'text'
      and char_length(trim(content)) between 1 and 2000
    )
  );

create or replace function public.live_support_message_preview(
  p_content text,
  p_message_type text
)
returns text
language sql
immutable
as $$
  select case
    when p_message_type = 'image' then
      case
        when char_length(trim(coalesce(p_content, ''))) > 0 then left(trim(p_content), 120)
        else '📷 Görsel'
      end
    when p_message_type = 'video' then
      case
        when char_length(trim(coalesce(p_content, ''))) > 0 then left(trim(p_content), 120)
        else '🎬 Video'
      end
    else left(trim(coalesce(p_content, '')), 120)
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

  select id into v_thread_id
  from public.live_support_threads
  where user_id = v_user_id;

  if v_thread_id is null then
    insert into public.live_support_threads (user_id, subject, topic)
    values (v_user_id, trim(p_subject), p_topic)
    returning id into v_thread_id;

    perform public.notify_admins_live_support(
      'Yeni canlı destek sohbeti',
      public.live_support_message_preview(p_message, p_message_type),
      jsonb_build_object('kind', 'live_support_started', 'thread_id', v_thread_id)
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

create or replace function public.send_live_support_message(
  p_thread_id uuid,
  p_content text default '',
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
  v_thread public.live_support_threads%rowtype;
  v_message_id uuid;
  v_is_staff boolean;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_message_type not in ('text', 'image', 'video') then
    raise exception 'Geçersiz mesaj türü';
  end if;

  if p_message_type = 'text' and char_length(trim(p_content)) < 1 then
    raise exception 'Mesaj boş olamaz';
  end if;

  if p_message_type in ('image', 'video') and p_media_url is null then
    raise exception 'Medya bulunamadı';
  end if;

  perform public.expire_live_support_sessions();

  select * into v_thread
  from public.live_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Destek sohbeti bulunamadı';
  end if;

  v_is_staff := public.is_moderator();

  if not v_is_staff and v_thread.user_id <> v_user_id then
    raise exception 'Bu sohbete erişiminiz yok';
  end if;

  insert into public.live_support_messages (
    thread_id, sender_id, content, message_type, media_url
  )
  values (
    p_thread_id,
    v_user_id,
    trim(p_content),
    p_message_type,
    p_media_url
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.admin_update_live_support_thread(
  p_thread_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.live_support_threads%rowtype;
  v_body text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_status not in ('open', 'waiting_user', 'waiting_support', 'resolved', 'closed', 'no_response') then
    raise exception 'Geçersiz durum';
  end if;

  select * into v_thread
  from public.live_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Sohbet bulunamadı';
  end if;

  update public.live_support_threads
  set
    status = p_status,
    resolved_at = case when p_status in ('resolved', 'closed', 'no_response') then now() else null end,
    session_expires_at = case
      when p_status in ('open', 'waiting_support') then null
      else session_expires_at
    end,
    updated_at = now(),
    assigned_admin_id = coalesce(assigned_admin_id, auth.uid())
  where id = p_thread_id;

  v_body := case p_status
    when 'resolved' then 'Destek talebiniz çözüldü olarak işaretlendi.'
    when 'closed' then 'Destek sohbetiniz kapatıldı. Yeni mesaj yazarsanız tekrar açılır.'
    when 'no_response' then 'Destek talebiniz yanıt alınamadığı için kapatıldı. Yeni mesaj yazarsanız tekrar açılır.'
    when 'waiting_user' then 'Destek ekibi yanıtınızı bekliyor.'
    when 'waiting_support' then 'Destek ekibimiz sohbetinizi yeniden açtı. Mesajlarınıza yanıt vereceğiz.'
    when 'open' then 'Destek ekibimiz sohbetinizi yeniden açtı.'
    else 'Canlı destek talebiniz güncellendi.'
  end;

  perform public.notify_user_system(
    v_thread.user_id,
    case
      when p_status in ('open', 'waiting_support') then 'Canlı destek yeniden açıldı'
      when p_status = 'no_response' then 'Canlı destek — yanıt alınamadı'
      else 'Canlı destek durumu güncellendi'
    end,
    v_body,
    jsonb_build_object(
      'kind', 'live_support_status',
      'thread_id', p_thread_id,
      'status', p_status
    ),
    case when p_status in ('open', 'waiting_support') then 'high' else 'normal' end,
    auth.uid()
  );
end;
$$;
