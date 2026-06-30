drop function if exists public.send_premium_support_message(uuid, text);
drop function if exists public.start_premium_support_thread(text, text, text);

-- Premium destek: 5 dk oturum süresi, görsel mesaj, geliştirilmiş bildirimler

alter table public.premium_support_messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image')),
  add column if not exists media_url text;

alter table public.premium_support_threads
  add column if not exists session_expires_at timestamptz;

alter table public.premium_support_messages
  drop constraint if exists premium_support_messages_content_check;

alter table public.premium_support_messages
  add constraint premium_support_messages_content_check
  check (
    (
      message_type = 'image'
      and media_url is not null
      and char_length(trim(content)) <= 2000
    )
    or (
      message_type = 'text'
      and char_length(trim(content)) between 1 and 2000
    )
  );

-- Süresi dolan oturumları kapat
create or replace function public.expire_premium_support_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.premium_support_threads%rowtype;
begin
  for v_thread in
    select *
    from public.premium_support_threads
    where session_expires_at is not null
      and session_expires_at <= now()
      and status in ('open', 'waiting_support')
  loop
    update public.premium_support_threads
    set
      status = 'closed',
      resolved_at = now(),
      session_expires_at = null,
      updated_at = now()
    where id = v_thread.id;

    perform public.notify_user_system(
      v_thread.user_id,
      'Destek görüşmesi sona erdi',
      '5 dakika içinde yanıt alınamadığı için sohbet kapatıldı. Yeni mesaj yazarsanız destek ekibi bilgilendirilir.',
      jsonb_build_object(
        'kind', 'premium_support_expired',
        'thread_id', v_thread.id
      ),
      'normal'
    );
  end loop;
end;
$$;

create or replace function public.premium_support_message_preview(
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
    else left(trim(coalesce(p_content, '')), 120)
  end;
$$;

create or replace function public.on_premium_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.premium_support_threads%rowtype;
  v_sender_role text;
  v_preview text;
  v_notify_body text;
begin
  select * into v_thread
  from public.premium_support_threads
  where id = new.thread_id;

  if not found then
    return new;
  end if;

  select role into v_sender_role
  from public.profiles
  where id = new.sender_id;

  v_preview := public.premium_support_message_preview(new.content, new.message_type);

  if v_sender_role in ('moderator', 'admin', 'super_admin') then
    update public.premium_support_threads
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
        'Premium destek ekibinden görsel yanıt geldi. Sohbeti açarak inceleyebilirsiniz.'
      when new.message_type = 'image' then
        left(trim(new.content), 200)
      else
        v_preview
    end;

    perform public.notify_user_system(
      v_thread.user_id,
      'Premium destek ekibinden yanıt',
      v_notify_body,
      jsonb_build_object(
        'kind', 'premium_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id
      ),
      'high',
      new.sender_id
    );
  else
    update public.premium_support_threads
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

    perform public.notify_admins_premium_support(
      'Yeni premium destek mesajı',
      v_preview,
      jsonb_build_object(
        'kind', 'premium_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id,
        'user_id', v_thread.user_id
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.start_premium_support_thread(
  p_message text default '',
  p_topic text default null,
  p_subject text default 'Premium Abonelik Desteği',
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
  v_snapshot jsonb;
  v_sub record;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_message_type not in ('text', 'image') then
    raise exception 'Geçersiz mesaj türü';
  end if;

  if p_message_type = 'text' and char_length(trim(p_message)) < 2 then
    raise exception 'Mesaj en az 2 karakter olmalıdır';
  end if;

  if p_message_type = 'image' and p_media_url is null then
    raise exception 'Görsel bulunamadı';
  end if;

  if p_topic is not null and p_topic not in (
    'purchase', 'billing', 'renewal', 'cancel', 'features', 'restore', 'other'
  ) then
    raise exception 'Geçersiz konu';
  end if;

  select
    ps.plan,
    ps.payment_provider,
    ps.status,
    ps.expires_at
  into v_sub
  from public.premium_subscriptions ps
  where ps.user_id = v_user_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  v_snapshot := jsonb_build_object(
    'is_premium', v_sub.plan is not null,
    'plan', v_sub.plan,
    'payment_provider', v_sub.payment_provider,
    'expires_at', v_sub.expires_at
  );

  select id into v_thread_id
  from public.premium_support_threads
  where user_id = v_user_id;

  if v_thread_id is null then
    insert into public.premium_support_threads (
      user_id, subject, topic, subscription_snapshot
    )
    values (
      v_user_id,
      trim(p_subject),
      p_topic,
      v_snapshot
    )
    returning id into v_thread_id;

    perform public.notify_admins_premium_support(
      'Yeni premium destek sohbeti',
      public.premium_support_message_preview(p_message, p_message_type),
      jsonb_build_object('kind', 'premium_support_started', 'thread_id', v_thread_id)
    );
  else
    update public.premium_support_threads
    set
      topic = coalesce(p_topic, topic),
      subject = case
        when status in ('resolved', 'closed') then trim(p_subject)
        else subject
      end,
      subscription_snapshot = v_snapshot,
      updated_at = now()
    where id = v_thread_id;
  end if;

  insert into public.premium_support_messages (
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
    'Premium destek talebiniz alındı',
    'Destek ekibimiz en geç 5 dakika içinde yanıt verecek. Yanıt geldiğinde bildirim alırsınız.',
    jsonb_build_object('kind', 'premium_support_started', 'thread_id', v_thread_id),
    'normal'
  );

  return v_thread_id;
end;
$$;

create or replace function public.send_premium_support_message(
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
  v_thread public.premium_support_threads%rowtype;
  v_message_id uuid;
  v_is_staff boolean;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_message_type not in ('text', 'image') then
    raise exception 'Geçersiz mesaj türü';
  end if;

  if p_message_type = 'text' and char_length(trim(p_content)) < 1 then
    raise exception 'Mesaj boş olamaz';
  end if;

  if p_message_type = 'image' and p_media_url is null then
    raise exception 'Görsel bulunamadı';
  end if;

  perform public.expire_premium_support_sessions();

  select * into v_thread
  from public.premium_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Destek sohbeti bulunamadı';
  end if;

  v_is_staff := public.is_moderator();

  if not v_is_staff and v_thread.user_id <> v_user_id then
    raise exception 'Bu sohbete erişiminiz yok';
  end if;

  insert into public.premium_support_messages (
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

create or replace function public.admin_update_premium_support_thread(
  p_thread_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.premium_support_threads%rowtype;
  v_body text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_status not in ('open', 'waiting_user', 'waiting_support', 'resolved', 'closed') then
    raise exception 'Geçersiz durum';
  end if;

  select * into v_thread
  from public.premium_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Sohbet bulunamadı';
  end if;

  update public.premium_support_threads
  set
    status = p_status,
    resolved_at = case when p_status in ('resolved', 'closed') then now() else null end,
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
    when 'waiting_user' then 'Destek ekibi yanıtınızı bekliyor.'
    when 'waiting_support' then 'Destek ekibimiz sohbetinizi yeniden açtı. Mesajlarınıza yanıt vereceğiz.'
    when 'open' then 'Destek ekibimiz sohbetinizi yeniden açtı.'
    else 'Premium destek talebiniz güncellendi.'
  end;

  perform public.notify_user_system(
    v_thread.user_id,
    case
      when p_status in ('open', 'waiting_support') then 'Premium destek yeniden açıldı'
      else 'Premium destek durumu güncellendi'
    end,
    v_body,
    jsonb_build_object(
      'kind', 'premium_support_status',
      'thread_id', p_thread_id,
      'status', p_status
    ),
    case when p_status in ('open', 'waiting_support') then 'high' else 'normal' end,
    auth.uid()
  );
end;
$$;

drop function if exists public.admin_list_premium_support_threads(text, int);

create or replace function public.admin_list_premium_support_threads(
  p_status text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  subject text,
  topic text,
  status text,
  user_unread_count int,
  support_unread_count int,
  last_message_at timestamptz,
  last_message_preview text,
  subscription_snapshot jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  session_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_premium_support_sessions();

  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    t.id,
    t.user_id,
    p.username,
    p.full_name,
    t.subject,
    t.topic,
    t.status,
    t.user_unread_count,
    t.support_unread_count,
    t.last_message_at,
    t.last_message_preview,
    t.subscription_snapshot,
    t.created_at,
    t.updated_at,
    t.session_expires_at
  from public.premium_support_threads t
  join public.profiles p on p.id = t.user_id
  where p_status = 'all' or t.status = p_status
  order by coalesce(t.last_message_at, t.created_at) desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

grant execute on function public.expire_premium_support_sessions() to authenticated;
grant execute on function public.start_premium_support_thread(text, text, text, text, text) to authenticated;
grant execute on function public.send_premium_support_message(uuid, text, text, text) to authenticated;
grant execute on function public.admin_list_premium_support_threads(text, int) to authenticated;
