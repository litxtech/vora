-- Hesap talep onayı / yeniden aktivasyonda kullanıcıya bildirim

create or replace function public.notify_user_account_reactivated(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    p_user_id,
    'system'::public.notification_event_type,
    p_title,
    left(p_body, 500),
    p_data || jsonb_build_object('kind', 'account_reactivated', 'account_status', 'active'),
    auth.uid()
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    p_user_id,
    'system'::public.notification_event_type,
    p_title,
    left(p_body, 500),
    p_data || jsonb_build_object('kind', 'account_reactivated', 'account_status', 'active'),
    auth.uid(),
    'system'::public.notification_category,
    'high'::public.notification_priority
  );
end;
$$;

create or replace function public.admin_reactivate_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  select account_status into v_previous_status
  from public.profiles
  where id = p_user_id;

  update public.profiles
  set account_status = 'active', updated_at = now()
  where id = p_user_id
    and account_status in ('frozen', 'deletion_pending');

  if not found then
    return;
  end if;

  update public.user_bans
  set is_active = false, lifted_at = now(), lifted_by = auth.uid()
  where user_id = p_user_id and is_active = true;

  perform public.notify_user_account_reactivated(
    p_user_id,
    'Hesabınız aktif edildi',
    'Hesabınız yeniden etkinleştirildi. Uygulamaya tekrar giriş yapabilirsiniz.',
    jsonb_build_object('previous_status', v_previous_status, 'source', 'admin_reactivate')
  );
end;
$$;

create or replace function public.admin_cancel_user_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  update public.profiles
  set
    account_status = 'active',
    deletion_requested_at = null,
    updated_at = now()
  where id = p_user_id
    and account_status = 'deletion_pending';

  if not found then
    return;
  end if;

  perform public.notify_user_account_reactivated(
    p_user_id,
    'Hesabınız aktif edildi',
    'Hesap silme talebiniz iptal edildi. Hesabınıza tekrar giriş yapabilirsiniz.',
    jsonb_build_object('previous_status', 'deletion_pending', 'source', 'admin_cancel_deletion')
  );
end;
$$;

create or replace function public.admin_resolve_lifecycle_request(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null,
  p_apply_action text default 'none'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_lifecycle_requests%rowtype;
  v_title text;
  v_body text;
  v_reactivated boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  if p_status not in ('approved', 'rejected', 'closed') then
    raise exception 'Geçersiz durum';
  end if;

  select * into v_request
  from public.account_lifecycle_requests
  where id = p_request_id;

  if not found then
    raise exception 'Talep bulunamadı';
  end if;

  if p_status = 'approved' then
    if p_apply_action = 'reactivate' then
      perform public.admin_reactivate_account(v_request.user_id);
      v_reactivated := true;
    elsif p_apply_action = 'cancel_deletion' then
      perform public.admin_cancel_user_deletion(v_request.user_id);
      v_reactivated := true;
    end if;
  end if;

  update public.account_lifecycle_requests
  set
    status = p_status,
    admin_id = auth.uid(),
    admin_note = nullif(trim(p_admin_note), ''),
    resolved_at = now(),
    updated_at = now()
  where id = p_request_id;

  if v_reactivated then
    return;
  end if;

  v_title := case p_status
    when 'approved' then 'Hesap talebiniz onaylandı'
    when 'rejected' then 'Hesap talebiniz reddedildi'
    else 'Hesap talebiniz güncellendi'
  end;

  v_body := coalesce(nullif(trim(p_admin_note), ''), v_title);

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_request.user_id,
    'system'::public.notification_event_type,
    v_title,
    left(v_body, 500),
    jsonb_build_object('request_id', p_request_id, 'status', p_status),
    auth.uid()
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_request.user_id,
    'system'::public.notification_event_type,
    v_title,
    left(v_body, 500),
    jsonb_build_object('request_id', p_request_id, 'status', p_status),
    auth.uid(),
    'system'::public.notification_category,
    case when p_status = 'approved' then 'high'::public.notification_priority else 'normal'::public.notification_priority end
  );
end;
$$;
