-- Hesap yaşam döngüsü: kullanıcı talepleri, admin istatistikleri, bildirimler

create table if not exists public.account_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_type text not null check (
    request_type in ('reactivate', 'cancel_deletion', 'restore_access', 'general')
  ),
  account_status_snapshot text not null,
  message text not null check (char_length(trim(message)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  admin_id uuid references public.profiles (id) on delete set null,
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_lifecycle_requests_status_idx
  on public.account_lifecycle_requests (status, created_at desc);

create index if not exists account_lifecycle_requests_user_idx
  on public.account_lifecycle_requests (user_id, created_at desc);

alter table public.account_lifecycle_requests enable row level security;

create policy account_lifecycle_requests_user_select on public.account_lifecycle_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy account_lifecycle_requests_user_insert on public.account_lifecycle_requests
  for insert to authenticated
  with check (user_id = auth.uid());

-- ─── Admin bildirim yardımcısı ───────────────────────────────────────────────

create or replace function public.notify_admins_account_lifecycle(
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_count integer := 0;
begin
  for v_admin in
    select id
    from public.profiles
    where role in ('moderator', 'admin', 'super_admin')
      and account_status = 'active'
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_admin.id,
      'system'::public.notification_event_type,
      p_title,
      left(p_body, 500),
      p_data || jsonb_build_object('admin_alert', true, 'kind', 'account_lifecycle')
    );

    insert into public.notifications (user_id, event_type, title, body, data, category, priority)
    values (
      v_admin.id,
      'system'::public.notification_event_type,
      p_title,
      left(p_body, 500),
      p_data || jsonb_build_object('admin_alert', true, 'kind', 'account_lifecycle'),
      'system'::public.notification_category,
      'high'::public.notification_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── Kullanıcı talebi ──────────────────────────────────────────────────────

create or replace function public.submit_account_lifecycle_request(
  p_request_type text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request_id uuid;
  v_username text;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_request_type not in ('reactivate', 'cancel_deletion', 'restore_access', 'general') then
    raise exception 'Geçersiz talep türü';
  end if;

  if char_length(trim(p_message)) < 10 then
    raise exception 'Mesaj en az 10 karakter olmalıdır';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profil bulunamadı';
  end if;

  if exists (
    select 1 from public.account_lifecycle_requests
    where user_id = v_user_id and status = 'pending'
  ) then
    raise exception 'Bekleyen bir talebiniz zaten var';
  end if;

  insert into public.account_lifecycle_requests (
    user_id, request_type, account_status_snapshot, message
  )
  values (
    v_user_id,
    p_request_type,
    v_profile.account_status,
    trim(p_message)
  )
  returning id into v_request_id;

  v_username := coalesce(v_profile.username, v_user_id::text);

  perform public.notify_admins_account_lifecycle(
    'Hesap yönetim talebi',
    '@' || v_username || ': ' || left(trim(p_message), 120),
    jsonb_build_object(
      'request_id', v_request_id,
      'user_id', v_user_id,
      'request_type', p_request_type,
      'account_status', v_profile.account_status
    )
  );

  return v_request_id;
end;
$$;

-- ─── Admin istatistikleri ───────────────────────────────────────────────────

create or replace function public.admin_account_lifecycle_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats jsonb;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz işlem';
  end if;

  select jsonb_build_object(
    'total_accounts', count(*)::int,
    'active_accounts', count(*) filter (where account_status = 'active')::int,
    'frozen_accounts', count(*) filter (where account_status = 'frozen')::int,
    'deletion_pending_accounts', count(*) filter (where account_status = 'deletion_pending')::int,
    'deleted_accounts', count(*) filter (where account_status = 'deleted')::int,
    'opened_today', count(*) filter (where created_at >= date_trunc('day', now()))::int,
    'opened_this_month', count(*) filter (where created_at >= date_trunc('month', now()))::int,
    'deleted_this_month', count(*) filter (
      where account_status = 'deleted'
        and deleted_at is not null
        and deleted_at >= date_trunc('month', now())
    )::int,
    'pending_requests', (
      select count(*)::int from public.account_lifecycle_requests where status = 'pending'
    )
  )
  into v_stats
  from public.profiles;

  return v_stats;
end;
$$;

-- ─── Admin talep listesi ────────────────────────────────────────────────────

create or replace function public.admin_list_account_lifecycle_requests(
  p_status text default 'pending',
  p_limit integer default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  request_type text,
  account_status_snapshot text,
  current_account_status text,
  message text,
  status text,
  admin_note text,
  created_at timestamptz,
  resolved_at timestamptz,
  profile_created_at timestamptz,
  deletion_requested_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz işlem';
  end if;

  return query
  select
    r.id,
    r.user_id,
    p.username,
    p.full_name,
    r.request_type,
    r.account_status_snapshot,
    p.account_status as current_account_status,
    r.message,
    r.status,
    r.admin_note,
    r.created_at,
    r.resolved_at,
    p.created_at as profile_created_at,
    p.deletion_requested_at,
    p.deleted_at
  from public.account_lifecycle_requests r
  join public.profiles p on p.id = r.user_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ─── Admin hesap işlemleri ──────────────────────────────────────────────────

create or replace function public.admin_reactivate_account(p_user_id uuid)
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
  set account_status = 'active', updated_at = now()
  where id = p_user_id
    and account_status in ('frozen', 'deletion_pending');

  update public.user_bans
  set is_active = false, lifted_at = now(), lifted_by = auth.uid()
  where user_id = p_user_id and is_active = true;
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
    elsif p_apply_action = 'cancel_deletion' then
      perform public.admin_cancel_user_deletion(v_request.user_id);
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

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category)
  values (
    v_request.user_id,
    'system'::public.notification_event_type,
    v_title,
    left(v_body, 500),
    jsonb_build_object('request_id', p_request_id, 'status', p_status),
    auth.uid(),
    'system'::public.notification_category
  );
end;
$$;

grant execute on function public.submit_account_lifecycle_request(text, text) to authenticated;
grant execute on function public.admin_account_lifecycle_stats() to authenticated;
grant execute on function public.admin_list_account_lifecycle_requests(text, integer) to authenticated;
grant execute on function public.admin_resolve_lifecycle_request(uuid, text, text, text) to authenticated;
grant execute on function public.admin_reactivate_account(uuid) to authenticated;
grant execute on function public.admin_cancel_user_deletion(uuid) to authenticated;
