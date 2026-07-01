-- Kullanıcı sesleri (Ses Oluştur) — orijinal ses paylaşımı ve kullanımı

do $$ begin
  create type public.sound_privacy as enum ('public', 'private');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sound_status as enum ('published', 'hidden', 'removed', 'suspended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sound_report_reason as enum (
    'copyright', 'inappropriate', 'spam', 'misleading_title'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_storage_path text,
  cover_url text,
  audio_storage_path text not null,
  audio_url text not null,
  duration_sec numeric(8, 2) not null default 0,
  privacy public.sound_privacy not null default 'public',
  status public.sound_status not null default 'published',
  tags text[] not null default '{}'::text[],
  usage_count integer not null default 0,
  listen_count integer not null default 0,
  like_count integer not null default 0,
  favorite_count integer not null default 0,
  share_count integer not null default 0,
  trend_score numeric(12, 2) not null default 0,
  points integer not null default 0,
  is_trending boolean not null default false,
  is_popular boolean not null default false,
  badge_tier integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sounds_title_len check (char_length(trim(title)) between 1 and 120),
  constraint sounds_duration_max check (duration_sec > 0 and duration_sec <= 60)
);

create index if not exists sounds_author_idx on public.sounds (author_id, created_at desc);
create index if not exists sounds_public_feed_idx
  on public.sounds (created_at desc)
  where status = 'published' and privacy = 'public';
create index if not exists sounds_trend_idx
  on public.sounds (trend_score desc, usage_count desc)
  where status = 'published' and privacy = 'public';
create index if not exists sounds_usage_idx on public.sounds (usage_count desc);
create index if not exists sounds_search_idx on public.sounds using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);

create table if not exists public.sound_usage (
  id uuid primary key default gen_random_uuid(),
  sound_id uuid not null references public.sounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  reel_id uuid references public.reels(id) on delete set null,
  story_item_id uuid references public.story_items(id) on delete set null,
  music_start_sec numeric(8, 2) not null default 0,
  music_end_sec numeric(8, 2) not null default 0,
  music_volume numeric(3, 2) not null default 0.8,
  original_audio_volume numeric(3, 2) not null default 1,
  listen_duration_sec numeric(8, 2) not null default 0,
  is_valid boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists sound_usage_sound_idx on public.sound_usage (sound_id, created_at desc);
create index if not exists sound_usage_user_idx on public.sound_usage (user_id, created_at desc);
create index if not exists sound_usage_created_idx on public.sound_usage (created_at desc);

create table if not exists public.sound_likes (
  sound_id uuid not null references public.sounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sound_id, user_id)
);

create index if not exists sound_likes_user_idx on public.sound_likes (user_id, created_at desc);

create table if not exists public.sound_favorites (
  sound_id uuid not null references public.sounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sound_id, user_id)
);

create index if not exists sound_favorites_user_idx on public.sound_favorites (user_id, created_at desc);

create table if not exists public.sound_reports (
  id uuid primary key default gen_random_uuid(),
  sound_id uuid not null references public.sounds(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason public.sound_report_reason not null,
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sound_reports_sound_idx on public.sound_reports (sound_id, created_at desc);
create index if not exists sound_reports_status_idx on public.sound_reports (status, created_at desc);

create table if not exists public.sound_statistics (
  sound_id uuid not null references public.sounds(id) on delete cascade,
  stat_date date not null,
  usage_count integer not null default 0,
  listen_count integer not null default 0,
  like_count integer not null default 0,
  favorite_count integer not null default 0,
  complete_listen_count integer not null default 0,
  primary key (sound_id, stat_date)
);

create index if not exists sound_statistics_date_idx on public.sound_statistics (stat_date desc);

create table if not exists public.sound_listens (
  id uuid primary key default gen_random_uuid(),
  sound_id uuid not null references public.sounds(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  duration_sec numeric(8, 2) not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sound_listens_sound_idx on public.sound_listens (sound_id, created_at desc);

-- İçerik tablolarına ses referansı
alter table public.posts
  add column if not exists sound_id uuid references public.sounds(id) on delete set null;

alter table public.reels
  add column if not exists sound_id uuid references public.sounds(id) on delete set null;

create index if not exists posts_sound_idx on public.posts (sound_id) where sound_id is not null;
create index if not exists reels_sound_idx on public.reels (sound_id) where sound_id is not null;

create trigger sounds_updated_at
  before update on public.sounds
  for each row execute function public.set_updated_at();

-- Rozet / trend eşikleri
create or replace function public.sync_sound_milestones(p_sound_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
  v_tier integer;
begin
  select usage_count into v_usage from public.sounds where id = p_sound_id;
  if not found then return; end if;

  v_tier := case
    when v_usage >= 10000 then 10000
    when v_usage >= 1000 then 1000
    when v_usage >= 500 then 500
    when v_usage >= 100 then 100
    else 0
  end;

  update public.sounds
  set
    badge_tier = greatest(badge_tier, v_tier),
    is_popular = v_usage >= 10000,
    is_trending = trend_score >= 50 or v_usage >= 1000,
    updated_at = now()
  where id = p_sound_id;
end;
$$;

create or replace function public.bump_sound_daily_stats(
  p_sound_id uuid,
  p_usage integer default 0,
  p_listen integer default 0,
  p_like integer default 0,
  p_favorite integer default 0,
  p_complete_listen integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sound_statistics (
    sound_id, stat_date, usage_count, listen_count, like_count, favorite_count, complete_listen_count
  )
  values (
    p_sound_id, current_date, p_usage, p_listen, p_like, p_favorite, p_complete_listen
  )
  on conflict (sound_id, stat_date) do update set
    usage_count = public.sound_statistics.usage_count + excluded.usage_count,
    listen_count = public.sound_statistics.listen_count + excluded.listen_count,
    like_count = public.sound_statistics.like_count + excluded.like_count,
    favorite_count = public.sound_statistics.favorite_count + excluded.favorite_count,
    complete_listen_count = public.sound_statistics.complete_listen_count + excluded.complete_listen_count;
end;
$$;

create or replace function public.notify_sound_owner(
  p_sound_id uuid,
  p_event_type text,
  p_title text,
  p_body text,
  p_actor_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select author_id into v_owner from public.sounds where id = p_sound_id;
  if v_owner is null or v_owner = coalesce(p_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    return;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (v_owner, p_event_type, p_title, p_body, p_data || jsonb_build_object('sound_id', p_sound_id), p_actor_id);

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_owner, p_event_type, p_title, p_body,
    p_data || jsonb_build_object('sound_id', p_sound_id),
    p_actor_id, 'social', 'normal'
  );
end;
$$;

-- Ses kullanım kaydı
create or replace function public.record_sound_usage(
  p_sound_id uuid,
  p_post_id uuid default null,
  p_reel_id uuid default null,
  p_story_item_id uuid default null,
  p_music_start_sec numeric default 0,
  p_music_end_sec numeric default 0,
  p_music_volume numeric default 0.8,
  p_original_audio_volume numeric default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_sound public.sounds%rowtype;
  v_valid boolean := true;
  v_recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_sound from public.sounds where id = p_sound_id;
  if not found then
    raise exception 'Ses bulunamadı';
  end if;

  if v_sound.status <> 'published' then
    raise exception 'Bu ses kullanılamaz';
  end if;

  if v_sound.privacy = 'private' and v_sound.author_id <> auth.uid() then
    raise exception 'Bu ses gizli';
  end if;

  -- Spam koruması: aynı kullanıcı 1 dk içinde aynı sese 5+ kullanım
  select count(*)::integer into v_recent_count
  from public.sound_usage
  where sound_id = p_sound_id
    and user_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    v_valid := false;
  end if;

  insert into public.sound_usage (
    sound_id, user_id, post_id, reel_id, story_item_id,
    music_start_sec, music_end_sec, music_volume, original_audio_volume, is_valid
  )
  values (
    p_sound_id, auth.uid(), p_post_id, p_reel_id, p_story_item_id,
    p_music_start_sec, p_music_end_sec, p_music_volume, p_original_audio_volume, v_valid
  )
  returning id into v_id;

  if v_valid then
    update public.sounds
    set
      usage_count = usage_count + 1,
      points = points + 1,
      trend_score = trend_score + 1.5,
      last_used_at = now(),
      updated_at = now()
    where id = p_sound_id;

    perform public.bump_sound_daily_stats(p_sound_id, 1, 0, 0, 0, 0);
    perform public.sync_sound_milestones(p_sound_id);

    perform public.notify_sound_owner(
      p_sound_id,
      'sound_used',
      'Sesin kullanıldı',
      'Birisi sesini içeriğinde kullandı.',
      auth.uid(),
      jsonb_build_object('usage_id', v_id)
    );
  end if;

  return v_id;
end;
$$;

create or replace function public.toggle_sound_like(p_sound_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_title text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  select exists(
    select 1 from public.sound_likes where sound_id = p_sound_id and user_id = auth.uid()
  ) into v_exists;

  if v_exists then
    delete from public.sound_likes where sound_id = p_sound_id and user_id = auth.uid();
    update public.sounds set like_count = greatest(0, like_count - 1), updated_at = now() where id = p_sound_id;
    return false;
  end if;

  insert into public.sound_likes (sound_id, user_id) values (p_sound_id, auth.uid());
  update public.sounds
  set like_count = like_count + 1, points = points + 2, trend_score = trend_score + 1, updated_at = now()
  where id = p_sound_id;

  select title into v_title from public.sounds where id = p_sound_id;
  perform public.bump_sound_daily_stats(p_sound_id, 0, 0, 1, 0, 0);
  perform public.notify_sound_owner(
    p_sound_id, 'sound_liked', 'Sesin beğenildi',
    coalesce(v_title, 'Sesin') || ' beğenildi.',
    auth.uid()
  );

  return true;
end;
$$;

create or replace function public.toggle_sound_favorite(p_sound_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_title text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  select exists(
    select 1 from public.sound_favorites where sound_id = p_sound_id and user_id = auth.uid()
  ) into v_exists;

  if v_exists then
    delete from public.sound_favorites where sound_id = p_sound_id and user_id = auth.uid();
    update public.sounds set favorite_count = greatest(0, favorite_count - 1), updated_at = now() where id = p_sound_id;
    return false;
  end if;

  insert into public.sound_favorites (sound_id, user_id) values (p_sound_id, auth.uid());
  update public.sounds
  set favorite_count = favorite_count + 1, points = points + 3, trend_score = trend_score + 1.2, updated_at = now()
  where id = p_sound_id;

  select title into v_title from public.sounds where id = p_sound_id;
  perform public.bump_sound_daily_stats(p_sound_id, 0, 0, 0, 1, 0);
  perform public.notify_sound_owner(
    p_sound_id, 'sound_favorited', 'Sesin favorilere eklendi',
    coalesce(v_title, 'Sesin') || ' kaydedildi.',
    auth.uid()
  );

  return true;
end;
$$;

create or replace function public.record_sound_listen(
  p_sound_id uuid,
  p_duration_sec numeric default 0,
  p_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sound_listens (sound_id, user_id, duration_sec, completed)
  values (p_sound_id, auth.uid(), greatest(0, coalesce(p_duration_sec, 0)), coalesce(p_completed, false));

  update public.sounds
  set listen_count = listen_count + 1, updated_at = now()
  where id = p_sound_id;

  perform public.bump_sound_daily_stats(
    p_sound_id, 0, 1, 0, 0, case when p_completed then 1 else 0 end
  );
end;
$$;

create or replace function public.report_sound(
  p_sound_id uuid,
  p_reason public.sound_report_reason,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  insert into public.sound_reports (sound_id, reporter_id, reason, details)
  values (p_sound_id, auth.uid(), p_reason, nullif(trim(coalesce(p_details, '')), ''))
  returning id into v_id;

  select title into v_title from public.sounds where id = p_sound_id;
  perform public.notify_sound_owner(
    p_sound_id, 'sound_reported', 'Sesin şikayet edildi',
    coalesce(v_title, 'Sesin') || ' hakkında şikayet alındı.',
    auth.uid(),
    jsonb_build_object('report_id', v_id, 'reason', p_reason::text)
  );

  return v_id;
end;
$$;

create or replace function public.search_sounds(p_query text, p_limit integer default 30)
returns setof public.sounds
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.sounds s
  left join public.profiles p on p.id = s.author_id
  where s.status = 'published'
    and (s.privacy = 'public' or s.author_id = auth.uid())
    and (
      p_query is null
      or trim(p_query) = ''
      or s.title ilike '%' || trim(p_query) || '%'
      or coalesce(s.description, '') ilike '%' || trim(p_query) || '%'
      or p.username ilike '%' || trim(p_query) || '%'
      or coalesce(p.full_name, '') ilike '%' || trim(p_query) || '%'
      or exists (
        select 1 from unnest(s.tags) t where t ilike '%' || trim(p_query) || '%'
      )
    )
  order by s.trend_score desc, s.usage_count desc, s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.get_trending_sounds(p_limit integer default 30)
returns setof public.sounds
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.sounds
  where status = 'published' and privacy = 'public'
  order by trend_score desc, usage_count desc, created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.get_following_sounds(p_limit integer default 30)
returns setof public.sounds
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.sounds s
  join public.follows f on f.following_id = s.author_id and f.follower_id = auth.uid()
  where s.status = 'published'
    and s.privacy = 'public'
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.get_user_sound_stats(p_user_id uuid)
returns table (
  total_sounds bigint,
  total_usage bigint,
  total_listens bigint,
  total_likes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(usage_count), 0)::bigint,
    coalesce(sum(listen_count), 0)::bigint,
    coalesce(sum(like_count), 0)::bigint
  from public.sounds
  where author_id = p_user_id
    and status <> 'removed';
$$;

create or replace function public.admin_moderate_sound(
  p_sound_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_action = 'delete' then
    update public.sounds set status = 'removed', updated_at = now() where id = p_sound_id;
  elsif p_action = 'suspend' then
    update public.sounds set status = 'suspended', updated_at = now() where id = p_sound_id;
  elsif p_action = 'restore' then
    update public.sounds set status = 'published', updated_at = now() where id = p_sound_id;
  elsif p_action = 'hide' then
    update public.sounds set status = 'hidden', updated_at = now() where id = p_sound_id;
  else
    raise exception 'Geçersiz işlem';
  end if;
end;
$$;

grant execute on function public.record_sound_usage(uuid, uuid, uuid, uuid, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.toggle_sound_like(uuid) to authenticated;
grant execute on function public.toggle_sound_favorite(uuid) to authenticated;
grant execute on function public.record_sound_listen(uuid, numeric, boolean) to authenticated;
grant execute on function public.report_sound(uuid, public.sound_report_reason, text) to authenticated;
grant execute on function public.search_sounds(text, integer) to authenticated, anon;
grant execute on function public.get_trending_sounds(integer) to authenticated, anon;
grant execute on function public.get_following_sounds(integer) to authenticated;
grant execute on function public.get_user_sound_stats(uuid) to authenticated, anon;
grant execute on function public.admin_moderate_sound(uuid, text, text) to authenticated;

-- RLS
alter table public.sounds enable row level security;
alter table public.sound_usage enable row level security;
alter table public.sound_likes enable row level security;
alter table public.sound_favorites enable row level security;
alter table public.sound_reports enable row level security;
alter table public.sound_statistics enable row level security;
alter table public.sound_listens enable row level security;

create policy sounds_select on public.sounds
  for select using (
    author_id = auth.uid()
    or (status = 'published' and privacy = 'public')
    or public.is_moderator()
  );

create policy sounds_insert on public.sounds
  for insert with check (auth.uid() = author_id);

create policy sounds_update on public.sounds
  for update using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy sounds_delete on public.sounds
  for delete using (auth.uid() = author_id or public.is_admin());

create policy sound_usage_select on public.sound_usage
  for select using (user_id = auth.uid() or public.is_moderator());

create policy sound_usage_insert on public.sound_usage
  for insert with check (auth.uid() = user_id);

create policy sound_likes_self on public.sound_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sound_likes_read on public.sound_likes
  for select using (true);

create policy sound_favorites_self on public.sound_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sound_favorites_read on public.sound_favorites
  for select using (auth.uid() = user_id or public.is_moderator());

create policy sound_reports_insert on public.sound_reports
  for insert with check (auth.uid() = reporter_id);

create policy sound_reports_read on public.sound_reports
  for select using (reporter_id = auth.uid() or public.is_moderator());

create policy sound_reports_admin on public.sound_reports
  for update using (public.is_moderator()) with check (public.is_moderator());

create policy sound_statistics_owner on public.sound_statistics
  for select using (
    exists (
      select 1 from public.sounds s
      where s.id = sound_id and (s.author_id = auth.uid() or public.is_moderator())
    )
  );

create policy sound_listens_insert on public.sound_listens
  for insert with check (auth.uid() = user_id or user_id is null);

create policy sound_listens_read on public.sound_listens
  for select using (public.is_moderator());

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-sounds',
  'user-sounds',
  true,
  5242880,
  array[
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/ogg',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
on conflict (id) do nothing;

create policy "user_sounds_public_read"
on storage.objects for select
using (bucket_id = 'user-sounds');

create policy "user_sounds_owner_upload"
on storage.objects for insert
with check (
  bucket_id = 'user-sounds'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "user_sounds_owner_update"
on storage.objects for update
using (
  bucket_id = 'user-sounds'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "user_sounds_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'user-sounds'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Özellik bayrağı
insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('user-sounds', 'Ses Oluştur', 'social', true)
on conflict (feature_id) do update set is_button_visible = excluded.is_button_visible;

alter publication supabase_realtime add table public.sounds;
