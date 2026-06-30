-- Destek talepleri, yaşam döngüsü durum bildirimleri, hesap aktivasyon detay verisi

-- ─── Yaşam döngüsü: in_progress durumu ───────────────────────────────────────

alter table public.account_lifecycle_requests
  drop constraint if exists account_lifecycle_requests_status_check;

alter table public.account_lifecycle_requests
  add constraint account_lifecycle_requests_status_check
  check (status in ('pending', 'in_progress', 'approved', 'rejected', 'closed'));

-- ─── Destek talepleri ────────────────────────────────────────────────────────

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'account' check (
    category in ('account', 'billing', 'technical', 'general')
  ),
  subject text not null check (char_length(trim(subject)) between 3 and 200),
  message text not null check (char_length(trim(message)) between 10 and 4000),
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')
  ),
  lifecycle_request_id uuid references public.account_lifecycle_requests (id) on delete set null,
  admin_id uuid references public.profiles (id) on delete set null,
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id, created_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

create policy support_tickets_user_select on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy support_tickets_user_insert on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());

-- ─── Sistem bildirimi yardımcısı ─────────────────────────────────────────────

create or replace function public.notify_user_system(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_priority text default 'normal',
  p_actor_id uuid default null
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
    p_data,
    coalesce(p_actor_id, auth.uid())
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    p_user_id,
    'system'::public.notification_event_type,
    p_title,
    left(p_body, 500),
    p_data,
    coalesce(p_actor_id, auth.uid()),
    'system'::public.notification_category,
    p_priority::public.notification_priority
  );
end;
$$;

-- ─── Hesap aktivasyon bildirimi (zengin veri) ────────────────────────────────

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
declare
  v_profile_created_at timestamptz;
begin
  select created_at into v_profile_created_at
  from public.profiles
  where id = p_user_id;

  perform public.notify_user_system(
    p_user_id,
    p_title,
    p_body,
    p_data || jsonb_build_object(
      'kind', 'account_reactivated',
      'account_status', 'active',
      'profile_created_at', v_profile_created_at,
      'reactivated_at', now()
    ),
    'high'
  );
end;
$$;

-- ─── Kullanıcı destek talebi ─────────────────────────────────────────────────

create or replace function public.submit_support_ticket(
  p_category text,
  p_subject text,
  p_message text,
  p_lifecycle_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_category not in ('account', 'billing', 'technical', 'general') then
    raise exception 'Geçersiz kategori';
  end if;

  if char_length(trim(p_subject)) < 3 then
    raise exception 'Konu en az 3 karakter olmalıdır';
  end if;

  if char_length(trim(p_message)) < 10 then
    raise exception 'Mesaj en az 10 karakter olmalıdır';
  end if;

  insert into public.support_tickets (
    user_id, category, subject, message, lifecycle_request_id
  )
  values (
    v_user_id,
    p_category,
    trim(p_subject),
    trim(p_message),
    p_lifecycle_request_id
  )
  returning id into v_ticket_id;

  perform public.notify_user_system(
    v_user_id,
    'Destek talebiniz alındı',
    'Talebiniz destek ekibine iletildi. İncelendiğinde bilgilendirileceksiniz.',
    jsonb_build_object('kind', 'support_ticket_received', 'ticket_id', v_ticket_id, 'status', 'open'),
    'normal'
  );

  perform public.notify_admins_account_lifecycle(
    'Yeni destek talebi',
    trim(p_subject) || ': ' || left(trim(p_message), 100),
    jsonb_build_object('ticket_id', v_ticket_id, 'kind', 'support_ticket')
  );

  return v_ticket_id;
end;
$$;

-- ─── Admin destek güncelleme ─────────────────────────────────────────────────

create or replace function public.admin_update_support_ticket(
  p_ticket_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_title text;
  v_body text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  if p_status not in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed') then
    raise exception 'Geçersiz durum';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'Talep bulunamadı';
  end if;

  update public.support_tickets
  set
    status = p_status,
    admin_id = auth.uid(),
    admin_note = nullif(trim(p_admin_note), ''),
    resolved_at = case when p_status in ('resolved', 'closed') then now() else null end,
    updated_at = now()
  where id = p_ticket_id;

  v_title := case p_status
    when 'open' then 'Destek talebiniz açık'
    when 'in_progress' then 'Destek talebiniz inceleniyor'
    when 'waiting_user' then 'Destek ekibi yanıtınızı bekliyor'
    when 'resolved' then 'Destek talebiniz çözüldü'
    else 'Destek talebiniz kapatıldı'
  end;

  v_body := coalesce(nullif(trim(p_admin_note), ''), v_title);

  perform public.notify_user_system(
    v_ticket.user_id,
    v_title,
    v_body,
    jsonb_build_object(
      'kind', 'support_ticket_update',
      'ticket_id', p_ticket_id,
      'status', p_status
    ),
    case when p_status in ('resolved', 'closed') then 'high' else 'normal' end
  );
end;
$$;

create or replace function public.admin_list_support_tickets(
  p_status text default 'all',
  p_limit integer default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  category text,
  subject text,
  message text,
  status text,
  admin_note text,
  lifecycle_request_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
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
    t.id,
    t.user_id,
    p.username,
    p.full_name,
    t.category,
    t.subject,
    t.message,
    t.status,
    t.admin_note,
    t.lifecycle_request_id,
    t.created_at,
    t.updated_at,
    t.resolved_at
  from public.support_tickets t
  join public.profiles p on p.id = t.user_id
  where p_status = 'all' or t.status = p_status
  order by t.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ─── Yaşam döngüsü: işleme al ───────────────────────────────────────────────

create or replace function public.admin_set_lifecycle_in_progress(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_lifecycle_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  select * into v_request
  from public.account_lifecycle_requests
  where id = p_request_id;

  if not found then
    raise exception 'Talep bulunamadı';
  end if;

  if v_request.status not in ('pending', 'in_progress') then
    raise exception 'Talep işleme alınamaz';
  end if;

  update public.account_lifecycle_requests
  set status = 'in_progress', updated_at = now()
  where id = p_request_id;

  perform public.notify_user_system(
    v_request.user_id,
    'Hesap talebiniz inceleniyor',
    'Talebiniz destek ekibi tarafından işleme alındı. Sonuçlandığında bilgilendirileceksiniz.',
    jsonb_build_object(
      'kind', 'account_lifecycle_update',
      'request_id', p_request_id,
      'status', 'in_progress'
    ),
    'normal'
  );
end;
$$;

-- ─── Kullanıcı talebi: alındı bildirimi + destek kaydı ───────────────────────

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
  v_subject text;
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
    where user_id = v_user_id and status in ('pending', 'in_progress')
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

  v_subject := case p_request_type
    when 'reactivate' then 'Hesap yeniden açma talebi'
    when 'cancel_deletion' then 'Silme iptali talebi'
    when 'restore_access' then 'Erişim talebi'
    else 'Hesap destek talebi'
  end;

  insert into public.support_tickets (
    user_id, category, subject, message, lifecycle_request_id, status
  )
  values (
    v_user_id,
    'account',
    v_subject,
    trim(p_message),
    v_request_id,
    'open'
  );

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

  perform public.notify_user_system(
    v_user_id,
    'Talebiniz alındı',
    'Hesap talebiniz destek ekibine iletildi. İncelendiğinde bilgilendirileceksiniz.',
    jsonb_build_object(
      'kind', 'account_lifecycle_received',
      'request_id', v_request_id,
      'status', 'pending'
    ),
    'normal'
  );

  return v_request_id;
end;
$$;

-- ─── Admin talep sonuçlandırma (zengin bildirimler) ──────────────────────────

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

  update public.support_tickets
  set
    status = case p_status
      when 'approved' then 'resolved'
      when 'rejected' then 'closed'
      else 'closed'
    end,
    admin_id = auth.uid(),
    admin_note = nullif(trim(p_admin_note), ''),
    resolved_at = now(),
    updated_at = now()
  where lifecycle_request_id = p_request_id;

  if v_reactivated then
    return;
  end if;

  v_title := case p_status
    when 'approved' then 'Hesap talebiniz onaylandı'
    when 'rejected' then 'Hesap talebiniz reddedildi'
    else 'Hesap talebiniz güncellendi'
  end;

  v_body := coalesce(nullif(trim(p_admin_note), ''), v_title);

  perform public.notify_user_system(
    v_request.user_id,
    v_title,
    v_body,
    jsonb_build_object(
      'kind', 'account_lifecycle_update',
      'request_id', p_request_id,
      'status', p_status
    ),
    case when p_status = 'approved' then 'high' else 'normal' end
  );
end;
$$;

grant execute on function public.submit_support_ticket(text, text, text, uuid) to authenticated;
grant execute on function public.admin_update_support_ticket(uuid, text, text) to authenticated;
grant execute on function public.admin_list_support_tickets(text, integer) to authenticated;
grant execute on function public.admin_set_lifecycle_in_progress(uuid) to authenticated;

-- Bekleyen filtresi: pending + in_progress

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
  where
    p_status = 'all'
    or (p_status = 'pending' and r.status in ('pending', 'in_progress'))
    or r.status = p_status
  order by r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.notify_user_system(uuid, text, text, jsonb, text, uuid) to authenticated;
