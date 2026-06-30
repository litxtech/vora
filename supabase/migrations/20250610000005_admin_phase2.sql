-- Admin Phase 2 — eksik merkezler, AI kuyruk, güvenlik, görevler, hashtag, sistem

-- ─── Schema extensions ───────────────────────────────────────────────────────

alter table public.conversations
  add column if not exists admin_locked boolean not null default false,
  add column if not exists admin_lock_reason text;

alter table public.hashtags
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_featured boolean not null default false;

-- Remote may have skipped 20250605000024_ai_moderation.sql
create table if not exists public.ai_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  target_type text,
  target_id uuid,
  text_sample text,
  flags jsonb not null default '[]'::jsonb,
  score numeric(5, 3),
  action text not null check (action in ('allowed', 'blocked', 'review')),
  provider text not null default 'rules',
  created_at timestamptz not null default now()
);

create index if not exists ai_moderation_logs_user_idx on public.ai_moderation_logs (user_id, created_at desc);
create index if not exists ai_moderation_logs_target_idx on public.ai_moderation_logs (target_type, target_id);

alter table public.ai_moderation_logs enable row level security;

do $pol$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_moderation_logs'
      and policyname = 'ai_moderation_logs_moderator_read'
  ) then
    create policy "ai_moderation_logs_moderator_read" on public.ai_moderation_logs
      for select using (public.is_moderator());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_moderation_logs'
      and policyname = 'ai_moderation_logs_self_read'
  ) then
    create policy "ai_moderation_logs_self_read" on public.ai_moderation_logs
      for select using (auth.uid() = user_id);
  end if;
end $pol$;

alter table public.ai_moderation_logs
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create table if not exists public.app_system_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_system_config (key, value) values
  ('min_app_version', '{"ios":"1.0.0","android":"1.0.0"}'::jsonb),
  ('maintenance_mode', '{"enabled":false,"message":""}'::jsonb),
  ('system_health', '{"supabase":"ok","push":"ok","agora":"ok","stripe":"ok"}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.admin_role_permissions (
  role public.user_role not null,
  permission_key text not null,
  allowed boolean not null default true,
  primary key (role, permission_key)
);

insert into public.admin_role_permissions (role, permission_key, allowed) values
  ('moderator', 'users.read', true),
  ('moderator', 'users.ban', true),
  ('moderator', 'content.moderate', true),
  ('moderator', 'reports.resolve', true),
  ('moderator', 'broadcasts.send', false),
  ('moderator', 'revenue.read', false),
  ('moderator', 'features.toggle', false),
  ('admin', 'users.read', true),
  ('admin', 'users.ban', true),
  ('admin', 'content.moderate', true),
  ('admin', 'reports.resolve', true),
  ('admin', 'broadcasts.send', true),
  ('admin', 'revenue.read', true),
  ('admin', 'features.toggle', true),
  ('super_admin', 'users.read', true),
  ('super_admin', 'users.ban', true),
  ('super_admin', 'content.moderate', true),
  ('super_admin', 'reports.resolve', true),
  ('super_admin', 'broadcasts.send', true),
  ('super_admin', 'revenue.read', true),
  ('super_admin', 'features.toggle', true)
on conflict (role, permission_key) do nothing;

alter table public.app_system_config enable row level security;
alter table public.admin_role_permissions enable row level security;

create policy app_system_config_admin on public.app_system_config
  for all to authenticated using (public.is_admin());

create policy admin_role_permissions_read on public.admin_role_permissions
  for select to authenticated using (public.is_moderator());

create policy admin_role_permissions_write on public.admin_role_permissions
  for all to authenticated using (public.is_admin());

-- ─── 1. Eksik merkezler ──────────────────────────────────────────────────────

create or replace function public.admin_list_duty_listings(p_limit int default 50)
returns table (id uuid, region_id text, listing_type text, name text, address text, phone text, duty_date date, is_open boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select d.id, d.region_id, d.listing_type::text, d.name, d.address, d.phone, d.duty_date, d.is_open, d.created_at
  from public.on_duty_listings d order by d.duty_date desc, d.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_remove_duty_listing(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.on_duty_listings where id = p_id;
end; $$;

create or replace function public.admin_list_tourism_places(p_limit int default 50)
returns table (id uuid, region_id text, category text, name text, description text, is_featured boolean, rating numeric, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select t.id, t.region_id, t.category::text, t.name, t.description, t.is_featured, t.rating, t.created_at
  from public.tourism_places t order by t.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_remove_tourism_place(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.tourism_places where id = p_id;
end; $$;

create or replace function public.admin_set_tourism_featured(p_id uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.tourism_places set is_featured = p_featured where id = p_id;
end; $$;

create or replace function public.admin_list_price_data(p_limit int default 50)
returns table (symbol_id uuid, symbol_key text, label text, unit text, value numeric, change_pct numeric, recorded_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select ps.id, ps.symbol_key::text, ps.label, ps.unit, snap.value, snap.change_pct, snap.recorded_at
  from public.price_symbols ps
  left join lateral (
    select s.value, s.change_pct, s.recorded_at from public.price_snapshots s
    where s.symbol_id = ps.id order by s.recorded_at desc limit 1
  ) snap on true
  order by ps.sort_order limit p_limit;
end; $$;

create or replace function public.admin_upsert_price_snapshot(p_symbol_key text, p_value numeric, p_change_pct numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_symbol_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  select id into v_symbol_id from public.price_symbols where symbol_key = p_symbol_key::public.price_symbol_key;
  if not found then raise exception 'Sembol bulunamadı'; end if;
  insert into public.price_snapshots (symbol_id, value, change_pct, source)
  values (v_symbol_id, p_value, p_change_pct, 'admin');
end; $$;

create or replace function public.admin_list_delivery_orders(p_limit int default 50)
returns table (id uuid, tracking_code text, customer_name text, status text, business_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select d.id, d.tracking_code, d.customer_name, d.status::text, d.business_id, d.created_at
  from public.delivery_orders d order by d.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_cancel_delivery_order(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.delivery_orders set status = 'cancelled', updated_at = now() where id = p_id;
end; $$;

create or replace function public.admin_list_city_scores(p_limit int default 50)
returns table (id uuid, region_id text, traffic_score numeric, cleanliness_score numeric, security_score numeric, quality_score numeric, vote_count int, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select cs.id, cs.region_id, cs.traffic_score, cs.cleanliness_score, cs.security_score, cs.quality_score, cs.vote_count, cs.updated_at
  from public.city_scores cs order by cs.vote_count desc limit p_limit;
end; $$;

create or replace function public.admin_reset_city_score_votes(p_region_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  delete from public.city_score_votes where region_id = p_region_id;
  update public.city_scores set vote_count = 0, traffic_score = 7, cleanliness_score = 7, security_score = 7, quality_score = 7, updated_at = now()
  where region_id = p_region_id;
end; $$;

create or replace function public.admin_nearby_region_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select r.id as region_id, r.name,
        (select count(*)::int from public.events e where e.region_id = r.id and e.status = 'published') as events,
        (select count(*)::int from public.job_listings j where j.region_id = r.id and j.status = 'published') as jobs,
        (select count(*)::int from public.businesses b where b.region_id = r.id) as businesses,
        (select count(*)::int from public.traffic_reports t where t.region_id = r.id and t.is_active) as traffic,
        (select count(*)::int from public.help_requests h where h.region_id = r.id and not h.is_resolved) as help_requests
      from public.regions r order by r.name
    ) t
  );
end; $$;

-- ─── 2. AI moderasyon kuyruğu ───────────────────────────────────────────────

create or replace function public.admin_list_ai_moderation_queue(p_limit int default 50)
returns table (
  id uuid, user_id uuid, username text, target_type text, target_id uuid,
  text_sample text, flags jsonb, score numeric, action text, provider text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select l.id, l.user_id, p.username, l.target_type, l.target_id, l.text_sample, l.flags, l.score, l.action, l.provider, l.created_at
  from public.ai_moderation_logs l
  left join public.profiles p on p.id = l.user_id
  where l.action = 'review' and l.reviewed_at is null
  order by l.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_resolve_ai_moderation(p_log_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_log public.ai_moderation_logs%rowtype;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  if p_action not in ('allowed', 'blocked') then raise exception 'Geçersiz aksiyon'; end if;
  select * into v_log from public.ai_moderation_logs where id = p_log_id;
  if not found then raise exception 'Kayıt bulunamadı'; end if;
  update public.ai_moderation_logs
  set action = p_action, reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
  where id = p_log_id;
  if p_action = 'blocked' and v_log.target_type is not null and v_log.target_id is not null then
    insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
    values (auth.uid(), v_log.target_type, v_log.target_id, 'hide', coalesce(p_note, 'AI moderasyon'), jsonb_build_object('ai_log_id', p_log_id));
  end if;
end; $$;

-- ─── 3. Mesaj moderasyonu aksiyonları ────────────────────────────────────────

create or replace function public.admin_get_messaging_context(p_target_type text, p_target_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  if p_target_type = 'message' then
    select jsonb_build_object(
      'type', 'message',
      'content', m.content,
      'sender_id', m.sender_id,
      'sender_username', p.username,
      'conversation_id', m.conversation_id,
      'created_at', m.created_at
    ) into v_result
    from public.messages m join public.profiles p on p.id = m.sender_id where m.id = p_target_id;
  elsif p_target_type = 'conversation' then
    select jsonb_build_object(
      'type', 'conversation',
      'title', c.title,
      'conversation_type', c.type,
      'admin_locked', c.admin_locked,
      'member_count', (select count(*)::int from public.conversation_members cm where cm.conversation_id = c.id),
      'recent_messages', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select m.content, p.username as sender, m.created_at
          from public.messages m join public.profiles p on p.id = m.sender_id
          where m.conversation_id = c.id order by m.created_at desc limit 5
        ) t
      )
    ) into v_result
    from public.conversations c where c.id = p_target_id;
  else
    v_result := jsonb_build_object('type', p_target_type, 'target_id', p_target_id);
  end if;
  return coalesce(v_result, '{}'::jsonb);
end; $$;

create or replace function public.admin_lock_conversation(p_conversation_id uuid, p_lock boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.conversations
  set admin_locked = p_lock, admin_lock_reason = case when p_lock then p_reason else null end, updated_at = now()
  where id = p_conversation_id;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'conversation', p_conversation_id, case when p_lock then 'hide' else 'warn' end, coalesce(p_reason, 'Admin sohbet kilidi'));
end; $$;

create or replace function public.admin_platform_mute_user(p_user_id uuid, p_hours int default 24, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  insert into public.user_warnings (user_id, issued_by, level, reason, expires_at)
  values (p_user_id, auth.uid(), 'temp_restriction', coalesce(p_reason, 'Mesajlaşma kısıtlaması'), now() + (p_hours || ' hours')::interval);
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'user', p_user_id, 'warn', coalesce(p_reason, 'Platform susturma'), jsonb_build_object('mute_hours', p_hours));
end; $$;

-- ─── 4. Günlük görevler ──────────────────────────────────────────────────────

do $enum$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'task_reward_type'
  ) then
    create type public.task_reward_type as enum ('points', 'badge', 'premium_days', 'achievement');
  end if;
end $enum$;

create table if not exists public.daily_task_definitions (
  key text primary key,
  title text not null,
  description text not null,
  target_count integer not null default 1,
  reward_type public.task_reward_type not null default 'points',
  reward_value integer not null default 0,
  reward_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.daily_task_definitions (key, title, description, target_count, reward_type, reward_value, reward_key, sort_order) values
  ('share_post', 'Gönderi Paylaş', 'Bugün bir gönderi paylaşın', 1, 'points', 15, null, 1),
  ('comment', 'Yorum Yap', 'Bugün bir gönderiye yorum yapın', 1, 'points', 10, null, 2),
  ('verify_news', 'Haber Doğrula', 'Bir haberi doğrulayın (muhabirler)', 1, 'points', 20, null, 3),
  ('join_event', 'Etkinliğe Katıl', 'Bir etkinliğe katılım bildirin', 1, 'points', 15, null, 4)
on conflict (key) do nothing;

alter table public.daily_task_definitions enable row level security;

do $pol$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_task_definitions'
      and policyname = 'daily_task_definitions_read'
  ) then
    create policy "daily_task_definitions_read" on public.daily_task_definitions
      for select using (true);
  end if;
end $pol$;

create or replace function public.admin_list_daily_tasks()
returns table (
  key text,
  title text,
  description text,
  target_count integer,
  reward_type public.task_reward_type,
  reward_value integer,
  reward_key text,
  sort_order integer,
  is_active boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select * from public.daily_task_definitions order by sort_order;
end; $$;

create or replace function public.admin_update_daily_task(
  p_key text, p_title text, p_description text, p_target_count int, p_reward_value int, p_is_active boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.daily_task_definitions
  set title = p_title, description = p_description, target_count = p_target_count,
      reward_value = p_reward_value, is_active = p_is_active
  where key = p_key;
end; $$;

-- ─── 5. Hashtag kürasyonu ────────────────────────────────────────────────────

create or replace function public.admin_list_hashtags(p_limit int default 50)
returns table (id uuid, tag text, post_count int, is_hidden boolean, is_featured boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select h.id, h.tag, h.post_count, h.is_hidden, h.is_featured, h.created_at
  from public.hashtags h order by h.post_count desc limit p_limit;
end; $$;

create or replace function public.admin_set_hashtag_flags(p_hashtag_id uuid, p_hidden boolean default null, p_featured boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.hashtags set
    is_hidden = coalesce(p_hidden, is_hidden),
    is_featured = coalesce(p_featured, is_featured)
  where id = p_hashtag_id;
end; $$;

-- ─── 6. Oturumlar + uyarılar ─────────────────────────────────────────────────

create or replace function public.admin_list_user_sessions(p_user_id uuid default null, p_limit int default 50)
returns table (id uuid, user_id uuid, username text, device_name text, device_type text, ip_address text, last_active_at timestamptz, is_current boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select s.id, s.user_id, p.username, s.device_name, s.device_type, s.ip_address, s.last_active_at, s.is_current
  from public.user_sessions s join public.profiles p on p.id = s.user_id
  where (p_user_id is null or s.user_id = p_user_id)
  order by s.last_active_at desc limit p_limit;
end; $$;

create or replace function public.admin_revoke_user_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  delete from public.user_sessions where id = p_session_id;
end; $$;

create or replace function public.admin_list_user_warnings(p_user_id uuid default null, p_limit int default 50)
returns table (id uuid, user_id uuid, username text, level text, reason text, issued_by_username text, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select w.id, w.user_id, pu.username, w.level::text, w.reason, ib.username, w.expires_at, w.created_at
  from public.user_warnings w
  join public.profiles pu on pu.id = w.user_id
  join public.profiles ib on ib.id = w.issued_by
  where (p_user_id is null or w.user_id = p_user_id)
  order by w.created_at desc limit p_limit;
end; $$;

-- ─── 7. Vora TV CMS ──────────────────────────────────────────────────────────

create or replace function public.admin_create_tv_video(
  p_title text, p_category public.tv_video_category, p_region_id text default null,
  p_description text default null, p_thumbnail_url text default null, p_mux_playback_id text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  insert into public.tv_videos (title, category, region_id, description, thumbnail_url, mux_playback_id)
  values (p_title, p_category, p_region_id, p_description, p_thumbnail_url, p_mux_playback_id)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_update_daily_summary(p_id uuid, p_summary_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.daily_city_summaries set summary_text = p_summary_text where id = p_id;
end; $$;

-- ─── 8. Stripe / premium detay ───────────────────────────────────────────────

create or replace function public.admin_list_stripe_subscriptions(p_limit int default 50)
returns table (
  id uuid, user_id uuid, username text, plan text, status text,
  stripe_subscription_id text, stripe_customer_id text, cancel_at_period_end boolean,
  starts_at timestamptz, expires_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select ps.id, ps.user_id, p.username, ps.plan::text, ps.status::text,
    ps.stripe_subscription_id, ps.stripe_customer_id, ps.cancel_at_period_end, ps.starts_at, ps.expires_at
  from public.premium_subscriptions ps join public.profiles p on p.id = ps.user_id
  order by ps.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_cancel_stripe_subscription(p_subscription_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub public.premium_subscriptions%rowtype;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  select * into v_sub from public.premium_subscriptions where id = p_subscription_id;
  if not found then raise exception 'Abonelik bulunamadı'; end if;
  update public.premium_subscriptions set status = 'cancelled', cancel_at_period_end = true, expires_at = now() where id = p_subscription_id;
  perform public.sync_premium_status(v_sub.user_id);
end; $$;

-- ─── 9. Granüler yetkiler ────────────────────────────────────────────────────

create or replace function public.admin_get_role_permissions()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (select role::text, permission_key, allowed from public.admin_role_permissions order by role, permission_key) t
  );
end; $$;

create or replace function public.admin_set_role_permission(p_role public.user_role, p_permission_key text, p_allowed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  insert into public.admin_role_permissions (role, permission_key, allowed)
  values (p_role, p_permission_key, p_allowed)
  on conflict (role, permission_key) do update set allowed = p_allowed;
end; $$;

create or replace function public.admin_check_permission(p_permission_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then return false; end if;
  if v_role = 'super_admin' then return true; end if;
  return exists (
    select 1 from public.admin_role_permissions
    where role = v_role and permission_key = p_permission_key and allowed = true
  );
end; $$;

-- ─── 10. Sistem sağlığı + zorunlu güncelleme ─────────────────────────────────

create or replace function public.admin_get_system_config()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return (
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.app_system_config
  );
end; $$;

create or replace function public.admin_update_system_config(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  insert into public.app_system_config (key, value, updated_by, updated_at)
  values (p_key, p_value, auth.uid(), now())
  on conflict (key) do update set value = p_value, updated_by = auth.uid(), updated_at = now();
end; $$;

-- ─── Dashboard güncelleme ────────────────────────────────────────────────────

create or replace function public.admin_center_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'active_polls', (select count(*)::int from public.polls where is_active = true),
    'tv_videos', (select count(*)::int from public.tv_videos),
    'active_traffic', (select count(*)::int from public.traffic_reports where is_active = true),
    'open_help', (select count(*)::int from public.help_requests where is_resolved = false),
    'active_deals', (select count(*)::int from public.local_deals where is_active = true),
    'volunteer_teams', (select count(*)::int from public.volunteer_teams where is_active = true and is_suspended = false),
    'duty_listings', (select count(*)::int from public.on_duty_listings where is_open = true),
    'tourism_places', (select count(*)::int from public.tourism_places),
    'delivery_orders', (select count(*)::int from public.delivery_orders where status in ('preparing','on_the_way')),
    'city_scores', (select count(*)::int from public.city_scores)
  );
end; $$;

create or replace function public.get_admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb; v_today timestamptz := date_trunc('day', now());
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'active_users', (select count(*)::int from public.profiles where account_status = 'active' and coalesce(last_seen_at, updated_at) > now() - interval '7 days'),
    'daily_registrations', (select count(*)::int from public.profiles where created_at >= v_today),
    'daily_posts', (select count(*)::int from public.posts where created_at >= v_today),
    'daily_comments', (select count(*)::int from public.post_comments where created_at >= v_today),
    'daily_messages', (select count(*)::int from public.messages where created_at >= v_today),
    'pending_reports', (select count(*)::int from public.content_reports where status = 'pending'),
    'pending_verifications', (select count(*)::int from public.businesses where registration_status = 'pending'),
    'pending_reporter_apps', (select count(*)::int from public.reporter_applications where status = 'pending'),
    'pending_ads', (select count(*)::int from public.business_ads where status = 'pending'),
    'pending_appeals', (select count(*)::int from public.moderation_appeals where status = 'pending'),
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'disputed_vcts', (select count(*)::int from public.content_trust_records where status = 'disputed'),
    'pending_post_verifications', (select count(*)::int from public.post_verifications where status = 'reviewing'),
    'ai_review_queue', (select count(*)::int from public.ai_moderation_logs where action = 'review' and reviewed_at is null)
  ) into v_result;
  return v_result;
end; $$;

-- Grants
grant execute on function public.admin_list_duty_listings to authenticated;
grant execute on function public.admin_remove_duty_listing to authenticated;
grant execute on function public.admin_list_tourism_places to authenticated;
grant execute on function public.admin_remove_tourism_place to authenticated;
grant execute on function public.admin_set_tourism_featured to authenticated;
grant execute on function public.admin_list_price_data to authenticated;
grant execute on function public.admin_upsert_price_snapshot to authenticated;
grant execute on function public.admin_list_delivery_orders to authenticated;
grant execute on function public.admin_cancel_delivery_order to authenticated;
grant execute on function public.admin_list_city_scores to authenticated;
grant execute on function public.admin_reset_city_score_votes to authenticated;
grant execute on function public.admin_nearby_region_stats to authenticated;
grant execute on function public.admin_list_ai_moderation_queue to authenticated;
grant execute on function public.admin_resolve_ai_moderation to authenticated;
grant execute on function public.admin_get_messaging_context to authenticated;
grant execute on function public.admin_lock_conversation to authenticated;
grant execute on function public.admin_platform_mute_user to authenticated;
grant execute on function public.admin_list_daily_tasks to authenticated;
grant execute on function public.admin_update_daily_task to authenticated;
grant execute on function public.admin_list_hashtags to authenticated;
grant execute on function public.admin_set_hashtag_flags to authenticated;
grant execute on function public.admin_list_user_sessions to authenticated;
grant execute on function public.admin_revoke_user_session to authenticated;
grant execute on function public.admin_list_user_warnings to authenticated;
grant execute on function public.admin_create_tv_video to authenticated;
grant execute on function public.admin_update_daily_summary to authenticated;
grant execute on function public.admin_list_stripe_subscriptions to authenticated;
grant execute on function public.admin_cancel_stripe_subscription to authenticated;
grant execute on function public.admin_get_role_permissions to authenticated;
grant execute on function public.admin_set_role_permission to authenticated;
grant execute on function public.admin_check_permission to authenticated;
grant execute on function public.admin_get_system_config to authenticated;
grant execute on function public.admin_update_system_config to authenticated;
