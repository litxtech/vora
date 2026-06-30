-- BÖLÜM 10 — Admin Paneli ve Yönetim Merkezi

-- Enums
create type public.report_queue_status as enum (
  'pending',
  'reviewing',
  'approved',
  'rejected'
);

create type public.ban_duration as enum (
  'hours_24',
  'days_7',
  'days_30',
  'permanent'
);

create type public.broadcast_type as enum (
  'system',
  'emergency',
  'update'
);

create type public.revenue_type as enum (
  'premium_business',
  'sponsored_content',
  'job_listing',
  'advertisement'
);

-- Moderasyon kuyruğu alanları
alter table public.content_reports
  add column if not exists status public.report_queue_status not null default 'pending',
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles (id) on delete set null,
  add column if not exists resolution_note text;

create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_assigned_idx on public.content_reports (assigned_to) where assigned_to is not null;

-- Mevcut raporları kuyruğa al
update public.content_reports set status = 'pending' where status is null;

-- Son giriş takibi
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- Ban sistemi
create table public.user_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  banned_by uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  duration public.ban_duration not null,
  expires_at timestamptz,
  is_active boolean not null default true,
  lifted_at timestamptz,
  lifted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index user_bans_user_active_idx on public.user_bans (user_id) where is_active = true;
create index user_bans_expires_idx on public.user_bans (expires_at) where is_active = true and expires_at is not null;

-- Moderasyon aksiyonlarına metadata
alter table public.moderation_actions
  add column if not exists metadata jsonb not null default '{}',
  add column if not exists report_id uuid references public.content_reports (id) on delete set null;

-- Toplu bildirim kayıtları
create table public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references public.profiles (id) on delete cascade,
  broadcast_type public.broadcast_type not null default 'system',
  title text not null,
  body text not null,
  region_id text references public.regions (id),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index admin_broadcasts_created_idx on public.admin_broadcasts (created_at desc);

-- Acil durum yayınları
create table public.emergency_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  region_id text references public.regions (id),
  severity public.incident_severity not null default 'high',
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index emergency_broadcasts_active_idx on public.emergency_broadcasts (is_active, created_at desc);

-- Gelir kayıtları
create table public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  revenue_type public.revenue_type not null,
  amount numeric(12, 2) not null,
  currency text not null default 'TRY',
  reference_id uuid,
  reference_label text,
  region_id text references public.regions (id),
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  notes text
);

create index revenue_records_type_idx on public.revenue_records (revenue_type, recorded_at desc);

-- Rol koruması: kullanıcılar kendi rollerini değiştiremez
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    ) then
      raise exception 'Yalnızca adminler rol değiştirebilir';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Yardımcı fonksiyonlar
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator', 'admin', 'super_admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

-- Ban süresi hesaplama
create or replace function public.ban_expires_at(p_duration public.ban_duration)
returns timestamptz
language sql
immutable
as $$
  select case p_duration
    when 'hours_24' then now() + interval '24 hours'
    when 'days_7' then now() + interval '7 days'
    when 'days_30' then now() + interval '30 days'
    when 'permanent' then null
  end;
$$;

-- Kullanıcı banlama RPC
create or replace function public.admin_ban_user(
  p_user_id uuid,
  p_reason text,
  p_duration public.ban_duration
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ban_id uuid;
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_expires := public.ban_expires_at(p_duration);

  update public.user_bans
  set is_active = false, lifted_at = now(), lifted_by = auth.uid()
  where user_id = p_user_id and is_active = true;

  insert into public.user_bans (user_id, banned_by, reason, duration, expires_at)
  values (p_user_id, auth.uid(), p_reason, p_duration, v_expires)
  returning id into v_ban_id;

  update public.profiles
  set account_status = 'frozen'
  where id = p_user_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(), 'user', p_user_id, 'ban', p_reason,
    jsonb_build_object('duration', p_duration, 'ban_id', v_ban_id)
  );

  return v_ban_id;
end;
$$;

-- Ban kaldırma
create or replace function public.admin_lift_ban(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.user_bans
  set is_active = false, lifted_at = now(), lifted_by = auth.uid()
  where user_id = p_user_id and is_active = true;

  update public.profiles
  set account_status = 'active'
  where id = p_user_id;
end;
$$;

-- Rapor çözümleme
create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status public.report_queue_status,
  p_resolution_note text default null,
  p_action public.moderation_action_type default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.content_reports%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_report from public.content_reports where id = p_report_id;
  if not found then
    raise exception 'Rapor bulunamadı';
  end if;

  update public.content_reports
  set
    status = p_status,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_note = p_resolution_note
  where id = p_report_id;

  if p_action is not null then
    insert into public.moderation_actions (
      moderator_id, target_type, target_id, action, reason, report_id, metadata
    )
    values (
      auth.uid(),
      v_report.target_type,
      v_report.target_id,
      p_action,
      coalesce(p_resolution_note, v_report.reason::text),
      p_report_id,
      jsonb_build_object('report_reason', v_report.reason)
    );
  end if;
end;
$$;

-- Dashboard istatistikleri
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_today timestamptz := date_trunc('day', now());
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'active_users', (
      select count(*)::int from public.profiles
      where account_status = 'active'
        and coalesce(last_seen_at, updated_at) > now() - interval '7 days'
    ),
    'daily_registrations', (
      select count(*)::int from public.profiles where created_at >= v_today
    ),
    'daily_posts', (
      select count(*)::int from public.posts where created_at >= v_today
    ),
    'daily_comments', (
      select count(*)::int from public.post_comments where created_at >= v_today
    ),
    'daily_messages', (
      select count(*)::int from public.messages where created_at >= v_today
    ),
    'pending_reports', (
      select count(*)::int from public.content_reports where status = 'pending'
    ),
    'pending_verifications', (
      select count(*)::int from public.businesses where registration_status = 'pending'
    )
  ) into v_result;

  return v_result;
end;
$$;

-- İstatistik paneli
create or replace function public.get_admin_statistics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select jsonb_build_object(
    'top_cities', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select r.name, count(p.id)::int as user_count
        from public.profiles p
        join public.regions r on r.id = p.region_id
        where p.region_id is not null
        group by r.id, r.name
        order by user_count desc
        limit 10
      ) t
    ),
    'top_users', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select p.id, p.username, p.full_name, p.contribution_score
        from public.profiles p
        where p.account_status = 'active'
        order by p.contribution_score desc
        limit 10
      ) t
    ),
    'top_posts', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select po.id, po.title, po.content, po.view_count, pr.username as author_username
        from public.posts po
        join public.profiles pr on pr.id = po.author_id
        where po.status = 'published'
        order by po.view_count desc
        limit 10
      ) t
    ),
    'top_categories', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select category::text, count(*)::int as post_count
        from public.posts
        where status = 'published'
        group by category
        order by post_count desc
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Gelir özeti
create or replace function public.get_admin_revenue_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return (
    select jsonb_build_object(
      'total_revenue', coalesce(sum(amount), 0),
      'by_type', (
        select coalesce(jsonb_object_agg(revenue_type, type_total), '{}'::jsonb)
        from (
          select revenue_type::text, sum(amount) as type_total
          from public.revenue_records
          group by revenue_type
        ) sub
      ),
      'premium_businesses', (
        select count(*)::int from public.businesses where is_verified = true
      ),
      'premium_users', (
        select count(*)::int from public.profiles where is_premium = true
      )
    )
    from public.revenue_records
  );
end;
$$;

-- Toplu bildirim gönderme
create or replace function public.admin_send_broadcast(
  p_type public.broadcast_type,
  p_title text,
  p_body text,
  p_region_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_event public.notification_event_type;
  v_recipient record;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_event := case p_type
    when 'emergency' then 'emergency'::public.notification_event_type
    else 'emergency'::public.notification_event_type
  end;

  for v_recipient in
    select p.id from public.profiles p
    where p.account_status = 'active'
      and (p_region_id is null or p.region_id = p_region_id)
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true), auth.uid());
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true), auth.uid());
    v_count := v_count + 1;
  end loop;

  insert into public.admin_broadcasts (sent_by, broadcast_type, title, body, region_id, recipient_count)
  values (auth.uid(), p_type, p_title, p_body, p_region_id, v_count);

  return v_count;
end;
$$;

-- Acil durum yayını
create or replace function public.admin_send_emergency(
  p_title text,
  p_body text,
  p_region_id text default null,
  p_severity public.incident_severity default 'high',
  p_expires_hours integer default 24
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  insert into public.emergency_broadcasts (sent_by, title, body, region_id, severity, expires_at)
  values (
    auth.uid(), p_title, p_body, p_region_id, p_severity,
    now() + (p_expires_hours || ' hours')::interval
  )
  returning id into v_id;

  v_count := public.admin_send_broadcast('emergency', p_title, p_body, p_region_id);

  return v_id;
end;
$$;

-- RLS
alter table public.user_bans enable row level security;
alter table public.admin_broadcasts enable row level security;
alter table public.emergency_broadcasts enable row level security;
alter table public.revenue_records enable row level security;

-- content_reports: moderatör okuma/güncelleme
create policy "content_reports_moderator_read" on public.content_reports
  for select using (public.is_moderator() or auth.uid() = reporter_id);

create policy "content_reports_moderator_update" on public.content_reports
  for update using (public.is_moderator());

-- moderation_actions
create policy "moderation_actions_moderator_read" on public.moderation_actions
  for select using (public.is_moderator());

create policy "moderation_actions_moderator_insert" on public.moderation_actions
  for insert with check (public.is_moderator() and auth.uid() = moderator_id);

-- user_bans
create policy "user_bans_admin_all" on public.user_bans
  for all using (public.is_admin());

create policy "user_bans_self_read" on public.user_bans
  for select using (auth.uid() = user_id);

-- admin_broadcasts
create policy "admin_broadcasts_moderator_read" on public.admin_broadcasts
  for select using (public.is_moderator());

create policy "admin_broadcasts_admin_insert" on public.admin_broadcasts
  for insert with check (public.is_admin() and auth.uid() = sent_by);

-- emergency_broadcasts
create policy "emergency_broadcasts_public_read" on public.emergency_broadcasts
  for select using (is_active = true or public.is_moderator());

create policy "emergency_broadcasts_admin_write" on public.emergency_broadcasts
  for all using (public.is_admin());

-- revenue_records
create policy "revenue_records_admin_all" on public.revenue_records
  for all using (public.is_admin());

-- Profil yönetimi: admin rol ve durum güncelleyebilir
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- İçerik moderasyonu
create policy "posts_moderator_update" on public.posts
  for update using (public.is_moderator() or auth.uid() = author_id);

create policy "posts_moderator_read" on public.posts
  for select using (public.is_moderator() or status = 'published' or auth.uid() = author_id);

create policy "reels_moderator_update" on public.reels
  for update using (public.is_moderator() or auth.uid() = author_id);

create policy "reels_moderator_read" on public.reels
  for select using (public.is_moderator() or status = 'published' or auth.uid() = author_id);

create policy "post_comments_moderator_update" on public.post_comments
  for update using (public.is_moderator() or auth.uid() = author_id);

-- İşletme onayı
create policy "businesses_admin_update" on public.businesses
  for update using (public.is_admin() or auth.uid() = owner_id);

create policy "businesses_moderator_read" on public.businesses
  for select using (true);

-- İş ilanları moderasyonu
create policy "job_listings_moderator_update" on public.job_listings
  for update using (public.is_moderator() or auth.uid() = author_id);

-- Harita olayları
create policy "incident_reports_moderator_update" on public.incident_reports
  for update using (public.is_moderator() or auth.uid() = reporter_id);

create policy "incident_reports_moderator_read" on public.incident_reports
  for select using (public.is_moderator() or true);

-- notification_outbox admin insert
create policy "notification_outbox_admin_insert" on public.notification_outbox
  for insert with check (public.is_admin());

create policy "notifications_admin_insert" on public.notifications
  for insert with check (public.is_admin());
