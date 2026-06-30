-- Oturum güvenliği ve şüpheli giriş bildirimi

alter type public.notification_event_type add value if not exists 'security_alert';

-- Oturum kaydı ve yeni cihaz tespiti
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

  update public.profiles set last_seen_at = now() where id = v_user_id;

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

-- Personel talebi şikayet hedefi
create or replace function public.resolve_report_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  case p_target_type
    when 'profile' then return p_target_id;
    when 'post' then
      select author_id into v_user_id from public.posts where id = p_target_id;
      return v_user_id;
    when 'comment' then
      select author_id into v_user_id from public.post_comments where id = p_target_id;
      return v_user_id;
    when 'reel' then
      select author_id into v_user_id from public.reels where id = p_target_id;
      return v_user_id;
    when 'message' then
      select sender_id into v_user_id from public.messages where id = p_target_id;
      return v_user_id;
    when 'business' then
      select owner_id into v_user_id from public.businesses where id = p_target_id;
      return v_user_id;
    when 'job_listing' then
      select author_id into v_user_id from public.job_listings where id = p_target_id;
      return v_user_id;
    when 'staff_request' then
      select author_id into v_user_id from public.staff_requests where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

-- Oturum yenileme (aktif kullanım)
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

  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;
