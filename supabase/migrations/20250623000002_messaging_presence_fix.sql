-- Mesajlaşma son görülme düzeltmesi: last_seen yalnızca çevrimdışı olunca güncellenir

alter table public.profiles
  add column if not exists is_online boolean not null default false;

alter table public.profiles
  add column if not exists last_active_at timestamptz;

create or replace function public.register_user_session(
  p_device_name text default null,
  p_device_type text default null,
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_new_device boolean := false;
  v_session_id uuid;
  v_device_label text;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  v_device_label := coalesce(nullif(trim(p_device_name), ''), coalesce(p_device_type, 'cihaz'));

  select not exists (
    select 1 from public.user_sessions s
    where s.user_id = v_user_id
      and coalesce(s.device_type, '') = coalesce(p_device_type, '')
      and coalesce(s.device_name, '') = coalesce(p_device_name, '')
  ) into v_is_new_device;

  update public.user_sessions set is_current = false where user_id = v_user_id;

  insert into public.user_sessions (user_id, device_name, device_type, is_current, last_active_at)
  values (v_user_id, p_device_name, p_device_type, true, now())
  returning id into v_session_id;

  update public.profiles
  set
    is_online = true,
    last_active_at = now()
  where id = v_user_id;

  if v_is_new_device then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_user_id,
      'security_alert'::public.notification_event_type,
      'Yeni cihazdan giriş',
      v_device_label || ' üzerinden hesabınıza giriş yapıldı. Siz değilseniz şifrenizi değiştirin.',
      jsonb_build_object('session_id', v_session_id, 'device_type', p_device_type, 'suspicious', true)
    );

    insert into public.notifications (user_id, event_type, title, body, data)
    values (
      v_user_id,
      'security_alert'::public.notification_event_type,
      'Yeni cihazdan giriş',
      v_device_label || ' üzerinden hesabınıza giriş yapıldı. Siz değilseniz şifrenizi değiştirin.',
      jsonb_build_object('session_id', v_session_id, 'device_type', p_device_type, 'suspicious', true)
    );
  end if;

  return jsonb_build_object('session_id', v_session_id, 'is_new_device', v_is_new_device);
end;
$$;

create or replace function public.touch_user_session(p_session_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_session_id is not null then
    update public.user_sessions
    set last_active_at = now()
    where id = p_session_id and user_id = auth.uid();
  else
    update public.user_sessions
    set last_active_at = now()
    where user_id = auth.uid() and is_current = true;
  end if;
end;
$$;

drop function if exists public.get_conversation_detail(uuid);

create function public.get_conversation_detail(p_conversation_id uuid)
returns table (
  id uuid,
  conversation_type public.conversation_type,
  title text,
  avatar_url text,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  other_is_verified boolean,
  other_last_seen_at timestamptz,
  other_is_online boolean,
  other_last_active_at timestamptz,
  other_last_read_at timestamptz,
  member_count bigint,
  my_role public.conversation_member_role
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.type as conversation_type,
    c.title,
    c.avatar_url,
    other_p.id as other_user_id,
    other_p.username as other_username,
    other_p.full_name as other_full_name,
    other_p.avatar_url as other_avatar_url,
    other_p.is_verified as other_is_verified,
    other_p.last_seen_at as other_last_seen_at,
    coalesce(other_p.is_online, false) as other_is_online,
    other_p.last_active_at as other_last_active_at,
    other_cm.last_read_at as other_last_read_at,
    (
      select count(*)::bigint
      from public.conversation_members cm_all
      where cm_all.conversation_id = c.id
    ) as member_count,
    my_cm.role as my_role
  from public.conversations c
  join public.conversation_members my_cm
    on my_cm.conversation_id = c.id and my_cm.user_id = auth.uid()
  left join lateral (
    select ocm.user_id, ocm.last_read_at
    from public.conversation_members ocm
    where ocm.conversation_id = c.id
      and ocm.user_id <> auth.uid()
      and c.type = 'direct'
    limit 1
  ) other_cm on true
  left join lateral (
    select
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.is_verified,
      p.last_seen_at,
      p.is_online,
      p.last_active_at
    from public.profiles p
    where p.id = other_cm.user_id
  ) other_p on true
  where c.id = p_conversation_id
    and not (
      c.type = 'direct'
      and other_p.id is not null
      and public.is_user_blocked(auth.uid(), other_p.id)
    );
$$;

grant execute on function public.get_conversation_detail(uuid) to authenticated;
