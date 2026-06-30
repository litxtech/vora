-- Admin panel eksikleri: reel sabitleme, keşfet kürasyonu, destek metriği,
-- Apple IAP alanları, Vora Studio yönetimi

-- ─── Reels sabitleme ─────────────────────────────────────────────────────────

alter table public.reels
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles (id) on delete set null,
  add column if not exists pinned_until timestamptz,
  add column if not exists pin_priority int not null default 0;

create index if not exists reels_pinned_feed_idx
  on public.reels (region_id, pin_priority desc, pinned_at desc)
  where is_pinned = true and status = 'published';

create or replace function public.expire_reel_pins()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reels
  set
    is_pinned = false,
    pinned_at = null,
    pinned_by = null,
    pinned_until = null,
    pin_priority = 0
  where is_pinned = true
    and pinned_until is not null
    and pinned_until <= now();
end;
$$;

create or replace function public.admin_pin_reel(
  p_reel_id uuid,
  p_days int default null,
  p_priority int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  perform public.expire_reel_pins();

  if p_days is not null and p_days > 0 then
    v_until := now() + (p_days || ' days')::interval;
  end if;

  update public.reels
  set
    is_pinned = true,
    pinned_at = now(),
    pinned_by = auth.uid(),
    pinned_until = v_until,
    pin_priority = greatest(0, coalesce(p_priority, 0))
  where id = p_reel_id and status = 'published';

  if not found then raise exception 'Reel bulunamadı veya yayında değil'; end if;
end;
$$;

create or replace function public.admin_unpin_reel(p_reel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.reels
  set
    is_pinned = false,
    pinned_at = null,
    pinned_by = null,
    pinned_until = null,
    pin_priority = 0
  where id = p_reel_id and is_pinned = true;
end;
$$;

create or replace function public.admin_update_reel_pin(
  p_reel_id uuid,
  p_days int default null,
  p_priority int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  perform public.expire_reel_pins();

  if p_days is not null then
    if p_days <= 0 then v_until := null;
    else v_until := now() + (p_days || ' days')::interval;
    end if;
  end if;

  update public.reels
  set
    pinned_until = case when p_days is not null then v_until else pinned_until end,
    pin_priority = case when p_priority is not null then greatest(0, p_priority) else pin_priority end
  where id = p_reel_id and is_pinned = true;

  if not found then raise exception 'Sabitleme bulunamadı'; end if;
end;
$$;

create or replace function public.admin_list_pinned_reels(p_limit int default 50)
returns table (
  reel_id uuid,
  caption text,
  author_id uuid,
  author_username text,
  region_id text,
  pinned_at timestamptz,
  pinned_until timestamptz,
  pin_priority int,
  pinned_by uuid,
  pinned_by_username text,
  view_count int,
  like_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  perform public.expire_reel_pins();

  return query
  select
    r.id,
    r.caption,
    r.author_id,
    author.username,
    r.region_id,
    r.pinned_at,
    r.pinned_until,
    r.pin_priority,
    r.pinned_by,
    pin_admin.username,
    r.view_count,
    r.like_count
  from public.reels r
  join public.profiles author on author.id = r.author_id
  left join public.profiles pin_admin on pin_admin.id = r.pinned_by
  where r.is_pinned = true
    and r.status = 'published'
    and (r.pinned_until is null or r.pinned_until > now())
  order by r.pin_priority desc, r.pinned_at desc
  limit p_limit;
end;
$$;

-- ─── Keşfet kürasyonu ────────────────────────────────────────────────────────

create table if not exists public.discovery_featured_items (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('posts', 'news', 'reels', 'events', 'businesses', 'jobs')),
  target_type text not null check (target_type in ('post', 'reel', 'business', 'event', 'job')),
  target_id uuid not null,
  region_key text not null default '__all__',
  scope text not null default 'region' check (scope in ('region', 'karadeniz')),
  priority int not null default 0,
  featured_until timestamptz,
  featured_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists discovery_featured_unique_idx
  on public.discovery_featured_items (tab, target_id, region_key, scope);

create index if not exists discovery_featured_lookup_idx
  on public.discovery_featured_items (tab, scope, region_key, priority desc, created_at desc);

alter table public.discovery_featured_items enable row level security;

create policy discovery_featured_public_read on public.discovery_featured_items
  for select using (
    featured_until is null or featured_until > now()
  );

create or replace function public.admin_list_discovery_featured(p_limit int default 50)
returns table (
  id uuid,
  tab text,
  target_type text,
  target_id uuid,
  target_label text,
  region_id text,
  scope text,
  priority int,
  featured_until timestamptz,
  featured_by_username text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    d.id,
    d.tab,
    d.target_type,
    d.target_id,
    case d.target_type
      when 'post' then coalesce((select left(coalesce(p.title, p.content), 80) from public.posts p where p.id = d.target_id), '—')
      when 'reel' then coalesce((select left(r.caption, 80) from public.reels r where r.id = d.target_id), '—')
      when 'business' then coalesce((select b.name from public.businesses b where b.id = d.target_id), '—')
      when 'event' then coalesce((select e.title from public.events e where e.id = d.target_id), '—')
      when 'job' then coalesce((select j.title from public.job_listings j where j.id = d.target_id), '—')
      else '—'
    end,
    nullif(d.region_key, '__all__'),
    d.scope,
    d.priority,
    d.featured_until,
    admin_p.username,
    d.created_at
  from public.discovery_featured_items d
  left join public.profiles admin_p on admin_p.id = d.featured_by
  where d.featured_until is null or d.featured_until > now()
  order by d.priority desc, d.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_feature_discovery_item(
  p_tab text,
  p_target_type text,
  p_target_id uuid,
  p_region_id text default null,
  p_scope text default 'region',
  p_priority int default 0,
  p_days int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_until timestamptz;
  v_region_key text := coalesce(nullif(trim(p_region_id), ''), '__all__');
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  if p_days is not null and p_days > 0 then
    v_until := now() + (p_days || ' days')::interval;
  end if;

  insert into public.discovery_featured_items (
    tab, target_type, target_id, region_key, scope, priority, featured_until, featured_by
  )
  values (
    p_tab, p_target_type, p_target_id, v_region_key, coalesce(p_scope, 'region'),
    greatest(0, coalesce(p_priority, 0)), v_until, auth.uid()
  )
  on conflict (tab, target_id, region_key, scope)
  do update set
    priority = excluded.priority,
    featured_until = excluded.featured_until,
    featured_by = auth.uid()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_unfeature_discovery_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.discovery_featured_items where id = p_id;
end;
$$;

create or replace function public.get_active_discovery_featured(
  p_tab text,
  p_region_id text,
  p_scope text default 'region'
)
returns table (target_id uuid, priority int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select d.target_id, d.priority
  from public.discovery_featured_items d
  where d.tab = p_tab
    and d.scope = coalesce(p_scope, 'region')
    and (d.featured_until is null or d.featured_until > now())
    and (
      d.region_key = '__all__'
      or d.region_key = p_region_id
      or p_scope = 'karadeniz'
    )
  order by d.priority desc, d.created_at desc;
end;
$$;

-- ─── Premium: Apple alanları ─────────────────────────────────────────────────
-- Dönüş tipi değiştiği için önce drop gerekir (PostgreSQL CREATE OR REPLACE kısıtı)

drop function if exists public.admin_list_premium_subscriptions(int);

create or replace function public.admin_list_premium_subscriptions(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  plan text,
  status text,
  payment_provider text,
  apple_original_transaction_id text,
  apple_product_id text,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  return query
  select
    ps.id,
    ps.user_id,
    p.username,
    p.full_name,
    ps.plan::text,
    ps.status::text,
    ps.payment_provider::text,
    ps.apple_original_transaction_id,
    ps.apple_product_id,
    ps.starts_at,
    ps.expires_at,
    ps.created_at
  from public.premium_subscriptions ps
  join public.profiles p on p.id = ps.user_id
  order by ps.created_at desc
  limit p_limit;
end;
$$;

-- ─── Vora Studio iş yönetimi ─────────────────────────────────────────────────

drop function if exists public.admin_list_vora_studio_jobs(int);

create or replace function public.admin_list_vora_studio_jobs(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  status text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select j.id, j.user_id, p.username, j.status::text, j.error_message, j.created_at, j.updated_at
  from public.vora_studio_jobs j
  join public.profiles p on p.id = j.user_id
  order by j.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_cancel_vora_studio_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.vora_studio_jobs
  set status = 'failed', error_message = 'Admin tarafından iptal edildi', updated_at = now()
  where id = p_job_id and status in ('queued', 'processing');
  if not found then raise exception 'İş bulunamadı veya iptal edilemez'; end if;
end;
$$;

create or replace function public.admin_retry_vora_studio_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.vora_studio_jobs
  set status = 'queued', error_message = null, updated_at = now()
  where id = p_job_id and status = 'failed';
  if not found then raise exception 'İş bulunamadı veya yeniden denenemez'; end if;
end;
$$;

-- ─── Dashboard: destek talebi sayacı ───────────────────────────────────────

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
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'active_users', (
      select count(*)::int from public.profiles
      where account_status = 'active'
        and coalesce(last_seen_at, updated_at) > now() - interval '7 days'
    ),
    'daily_registrations', (select count(*)::int from public.profiles where created_at >= v_today),
    'daily_posts', (select count(*)::int from public.posts where created_at >= v_today),
    'daily_comments', (select count(*)::int from public.post_comments where created_at >= v_today),
    'daily_messages', (select count(*)::int from public.messages where created_at >= v_today),
    'pending_reports', (select count(*)::int from public.content_reports where status = 'pending'),
    'pending_verifications', (select count(*)::int from public.businesses where registration_status = 'pending'),
    'pending_identity_verifications', (
      select count(*)::int from public.identity_verification_requests
      where status in ('pending', 'in_review')
    ),
    'pending_reporter_apps', (select count(*)::int from public.reporter_applications where status = 'pending'),
    'pending_ads', (select count(*)::int from public.business_ads where status = 'pending'),
    'pending_appeals', (select count(*)::int from public.moderation_appeals where status = 'pending'),
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'disputed_vcts', (select count(*)::int from public.content_trust_records where status = 'disputed'),
    'pending_post_verifications', (select count(*)::int from public.post_verifications where status = 'reviewing'),
    'ai_review_queue', (select count(*)::int from public.ai_moderation_logs where action = 'review' and reviewed_at is null),
    'pending_support_tickets', (
      select count(*)::int from public.support_tickets
      where status in ('open', 'in_progress', 'waiting_user')
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

grant execute on function public.expire_reel_pins to authenticated;
grant execute on function public.admin_pin_reel to authenticated;
grant execute on function public.admin_unpin_reel to authenticated;
grant execute on function public.admin_update_reel_pin to authenticated;
grant execute on function public.admin_list_pinned_reels to authenticated;
grant execute on function public.admin_list_discovery_featured to authenticated;
grant execute on function public.admin_feature_discovery_item to authenticated;
grant execute on function public.admin_unfeature_discovery_item to authenticated;
grant execute on function public.get_active_discovery_featured to authenticated;
grant execute on function public.admin_cancel_vora_studio_job to authenticated;
grant execute on function public.admin_retry_vora_studio_job to authenticated;
grant execute on function public.admin_list_premium_subscriptions to authenticated;
grant execute on function public.admin_list_vora_studio_jobs to authenticated;
