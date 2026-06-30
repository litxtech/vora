-- BÖLÜM 11 — Moderasyon, Güvenlik, Şikayet Sistemi ve Çocuk Koruma

-- Şikayet kategorileri genişletme
alter type public.report_reason add value if not exists 'fake_account';
alter type public.report_reason add value if not exists 'threat';
alter type public.report_reason add value if not exists 'hate_speech';
alter type public.report_reason add value if not exists 'inappropriate';
alter type public.report_reason add value if not exists 'personal_data';

-- Uyarı seviyeleri (1→4 kademeli ceza)
create type public.warning_level as enum (
  'warning',
  'temp_restriction',
  'temp_suspension',
  'permanent_ban'
);

-- Sahte haber işaretleme türleri
create type public.misinfo_flag_type as enum (
  'wrong_info',
  'incomplete_info',
  'outdated',
  'wrong_location'
);

-- Sessize alma
create table public.user_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint user_mutes_no_self check (muter_id <> muted_id)
);

create index user_mutes_muter_idx on public.user_mutes (muter_id);

-- Kullanıcı uyarıları
create table public.user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  issued_by uuid not null references public.profiles (id) on delete cascade,
  report_id uuid references public.content_reports (id) on delete set null,
  level public.warning_level not null default 'warning',
  reason text not null,
  expires_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index user_warnings_user_idx on public.user_warnings (user_id, created_at desc);

-- Topluluk sahte haber işaretlemeleri
create table public.content_misinfo_flags (
  id uuid primary key default gen_random_uuid(),
  flagger_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  flag_type public.misinfo_flag_type not null,
  details text,
  created_at timestamptz not null default now(),
  unique (flagger_id, target_type, target_id, flag_type)
);

create index content_misinfo_flags_target_idx on public.content_misinfo_flags (target_type, target_id);

-- Şikayet önceliği (çocuk güvenliği acil sıra)
alter table public.content_reports
  add column if not exists priority smallint not null default 0;

create index content_reports_priority_idx on public.content_reports (priority desc, created_at desc)
  where status in ('pending', 'reviewing');

-- Güvenlik tercihleri ve hassas içerik
alter table public.profiles
  add column if not exists safety_preferences jsonb not null default '{"show_sensitive_content": false, "blur_sensitive_content": true}'::jsonb;

alter table public.posts
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists requires_moderation boolean not null default false;

alter table public.reels
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists requires_moderation boolean not null default false;

-- Oturum takibi (çoklu cihaz yönetimi)
create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_name text,
  device_type text,
  ip_address text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  is_current boolean not null default false
);

create index user_sessions_user_idx on public.user_sessions (user_id, last_active_at desc);

-- Spam koruma: hız sınırı kayıtları
create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_user_action_idx on public.rate_limit_events (user_id, action_type, created_at desc);

-- Rapor hedef çözümleyici genişletme
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
    else return null;
  end case;
end;
$$;

-- Çocuk güvenliği şikayetlerine acil öncelik
create or replace function public.set_report_priority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.priority := case new.reason
    when 'child_safety' then 100
    when 'violence' then 80
    when 'threat' then 70
    when 'personal_data' then 60
    else 0
  end;
  return new;
end;
$$;

drop trigger if exists content_reports_priority on public.content_reports;
create trigger content_reports_priority
  before insert on public.content_reports
  for each row execute function public.set_report_priority();

-- Güven puanı cezaları — yeni kategoriler
create or replace function public.on_content_reported_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int;
begin
  v_user_id := public.resolve_report_target_user(new.target_type, new.target_id);
  if v_user_id is null or v_user_id = new.reporter_id then
    return new;
  end if;

  v_penalty := case new.reason
    when 'spam' then -5
    when 'misinformation' then -15
    when 'child_safety' then -20
    when 'harassment' then -10
    when 'fraud' then -10
    when 'abuse' then -10
    when 'violence' then -10
    when 'fake_account' then -8
    when 'threat' then -15
    when 'hate_speech' then -12
    when 'inappropriate' then -8
    when 'personal_data' then -12
    else -5
  end;

  perform public.adjust_trust_score(v_user_id, v_penalty);
  return new;
end;
$$;

-- Engelleme kontrolü
create or replace function public.is_user_blocked(p_viewer_id uuid, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where blocker_id = p_viewer_id and blocked_id = p_target_id and is_restricted = false
  )
  or exists (
    select 1 from public.user_blocks
    where blocker_id = p_target_id and blocked_id = p_viewer_id and is_restricted = false
  );
$$;

-- Sessize alma kontrolü
create or replace function public.is_user_muted(p_viewer_id uuid, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_mutes
    where muter_id = p_viewer_id and muted_id = p_target_id
  );
$$;

-- Hız sınırı kontrolü (spam koruması)
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_count int default 10,
  p_window_seconds int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*)::int into v_count
  from public.rate_limit_events
  where user_id = p_user_id
    and action_type = p_action
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_count then
    return false;
  end if;

  insert into public.rate_limit_events (user_id, action_type) values (p_user_id, p_action);
  return true;
end;
$$;

-- Yorum spam koruması
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit(new.author_id, 'comment', 15, 60) then
    raise exception 'Çok fazla yorum gönderdiniz. Lütfen bekleyin.';
  end if;
  return new;
end;
$$;

drop trigger if exists post_comments_rate_limit on public.post_comments;
create trigger post_comments_rate_limit
  before insert on public.post_comments
  for each row execute function public.enforce_comment_rate_limit();

-- Mesaj spam koruması
create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit(new.sender_id, 'message', 30, 60) then
    raise exception 'Çok fazla mesaj gönderdiniz. Lütfen bekleyin.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_message_rate_limit();

-- Şüpheli içerik ön-moderasyonu
create or replace function public.detect_suspicious_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
begin
  v_text := lower(coalesce(new.title, '') || ' ' || coalesce(new.content, ''));

  if v_text ~ '(dolandır|scam|sahte|ifşa|plaka|telefon\s*numara|kimlik\s*belge)'
    or v_text ~ '\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}'
    or v_text ~ '0\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}'
  then
    new.requires_moderation := true;
    new.status := 'draft';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_suspicious_content on public.posts;
create trigger posts_suspicious_content
  before insert or update of content, title on public.posts
  for each row execute function public.detect_suspicious_content();

-- Moderatör uyarı verme
create or replace function public.moderator_issue_warning(
  p_user_id uuid,
  p_level public.warning_level,
  p_reason text,
  p_report_id uuid default null,
  p_expires_hours int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warning_id uuid;
  v_expires timestamptz;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_expires_hours is not null then
    v_expires := now() + (p_expires_hours || ' hours')::interval;
  end if;

  insert into public.user_warnings (user_id, issued_by, report_id, level, reason, expires_at)
  values (p_user_id, auth.uid(), p_report_id, p_level, p_reason, v_expires)
  returning id into v_warning_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, report_id, metadata)
  values (
    auth.uid(), 'user', p_user_id, 'warn', p_reason, p_report_id,
    jsonb_build_object('warning_id', v_warning_id, 'level', p_level)
  );

  if p_level = 'temp_restriction' then
    update public.profiles set account_status = 'frozen' where id = p_user_id;
  elsif p_level in ('temp_suspension', 'permanent_ban') then
    perform public.admin_ban_user(
      p_user_id,
      p_reason,
      case p_level when 'permanent_ban' then 'permanent'::public.ban_duration else 'days_7'::public.ban_duration end
    );
  end if;

  return v_warning_id;
end;
$$;

-- RLS
alter table public.user_mutes enable row level security;
alter table public.user_warnings enable row level security;
alter table public.content_misinfo_flags enable row level security;
alter table public.user_sessions enable row level security;
alter table public.rate_limit_events enable row level security;

create policy "user_mutes_self_all" on public.user_mutes
  for all using (auth.uid() = muter_id) with check (auth.uid() = muter_id);

create policy "user_warnings_self_read" on public.user_warnings
  for select using (auth.uid() = user_id or public.is_moderator());

create policy "user_warnings_moderator_insert" on public.user_warnings
  for insert with check (public.is_moderator() and auth.uid() = issued_by);

create policy "content_misinfo_flags_self_insert" on public.content_misinfo_flags
  for insert with check (auth.uid() = flagger_id);

create policy "content_misinfo_flags_public_read" on public.content_misinfo_flags
  for select using (true);

create policy "user_sessions_self_all" on public.user_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rate_limit_events_self_insert" on public.rate_limit_events
  for insert with check (auth.uid() = user_id);
