-- Vora Müzik Kütüphanesi — paylaşımlara müzik ekleme sistemi

do $$ begin
  create type public.music_license_status as enum ('licensed', 'pending', 'unlicensed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.music_publication_status as enum ('active', 'hidden', 'blocked');
exception when duplicate_object then null;
end $$;

-- Kategoriler
create table if not exists public.music_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists music_categories_sort_idx on public.music_categories (sort_order, label);

-- Müzik parçaları
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  display_title text not null,
  artist text not null default '',
  album text,
  category_id uuid references public.music_categories (id) on delete set null,
  cover_storage_path text,
  cover_url text,
  audio_storage_path text,
  audio_url text not null,
  duration_seconds numeric(8, 2) not null default 0,
  license_status public.music_license_status not null default 'pending',
  license_info text,
  publication_status public.music_publication_status not null default 'hidden',
  is_trending boolean not null default false,
  is_featured boolean not null default false,
  is_editor_pick boolean not null default false,
  sort_order integer not null default 0,
  usage_count integer not null default 0,
  view_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists music_tracks_category_idx on public.music_tracks (category_id);
create index if not exists music_tracks_publication_idx on public.music_tracks (publication_status, license_status);
create index if not exists music_tracks_usage_idx on public.music_tracks (usage_count desc);
create index if not exists music_tracks_created_idx on public.music_tracks (created_at desc);
create index if not exists music_tracks_search_idx on public.music_tracks using gin (
  to_tsvector('simple', coalesce(display_title, '') || ' ' || coalesce(title, '') || ' ' || coalesce(artist, '') || ' ' || coalesce(album, ''))
);

-- Kullanım kayıtları (istatistik + trend)
create table if not exists public.music_track_usages (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  reel_id uuid references public.reels (id) on delete set null,
  music_start_sec numeric(8, 2) not null default 0,
  music_end_sec numeric(8, 2) not null default 0,
  music_volume numeric(3, 2) not null default 0.8,
  original_audio_volume numeric(3, 2) not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists music_track_usages_track_idx on public.music_track_usages (track_id, created_at desc);
create index if not exists music_track_usages_user_idx on public.music_track_usages (user_id, created_at desc);
create index if not exists music_track_usages_created_idx on public.music_track_usages (created_at desc);

-- Son kullanılan müzikler
create table if not exists public.user_recent_music (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index if not exists user_recent_music_used_idx on public.user_recent_music (user_id, used_at desc);

-- Gönderi / reel müzik meta
alter table public.posts
  add column if not exists music_track_id uuid references public.music_tracks (id) on delete set null,
  add column if not exists music_start_sec numeric(8, 2),
  add column if not exists music_end_sec numeric(8, 2),
  add column if not exists music_volume numeric(3, 2),
  add column if not exists original_audio_volume numeric(3, 2);

alter table public.reels
  add column if not exists music_track_id uuid references public.music_tracks (id) on delete set null,
  add column if not exists music_start_sec numeric(8, 2),
  add column if not exists music_end_sec numeric(8, 2),
  add column if not exists music_volume numeric(3, 2),
  add column if not exists original_audio_volume numeric(3, 2);

create index if not exists posts_music_track_idx on public.posts (music_track_id) where music_track_id is not null;
create index if not exists reels_music_track_idx on public.reels (music_track_id) where music_track_id is not null;

-- updated_at tetikleyicileri
create trigger music_categories_updated_at
  before update on public.music_categories
  for each row execute function public.set_updated_at();

create trigger music_tracks_updated_at
  before update on public.music_tracks
  for each row execute function public.set_updated_at();

-- Kullanım istatistikleri
create or replace function public.music_track_usage_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.music_tracks
  set
    usage_count = usage_count + 1,
    last_used_at = new.created_at
  where id = new.track_id;

  insert into public.user_recent_music (user_id, track_id, used_at)
  values (new.user_id, new.track_id, new.created_at)
  on conflict (user_id, track_id) do update set used_at = excluded.used_at;

  return new;
end;
$$;

drop trigger if exists music_track_usage_stats on public.music_track_usages;
create trigger music_track_usage_stats
  after insert on public.music_track_usages
  for each row execute function public.music_track_usage_stats_trigger();

-- Arama RPC
create or replace function public.search_music_tracks(p_query text, p_limit integer default 30)
returns setof public.music_tracks
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.music_tracks t
  where t.publication_status = 'active'
    and t.license_status = 'licensed'
    and (
      p_query is null
      or trim(p_query) = ''
      or t.display_title ilike '%' || trim(p_query) || '%'
      or t.title ilike '%' || trim(p_query) || '%'
      or t.artist ilike '%' || trim(p_query) || '%'
      or coalesce(t.album, '') ilike '%' || trim(p_query) || '%'
    )
  order by t.usage_count desc, t.sort_order asc, t.display_title asc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

-- Trend RPC
create or replace function public.get_trending_music_tracks(p_period text default '7d', p_limit integer default 30)
returns table (
  id uuid,
  title text,
  display_title text,
  artist text,
  album text,
  category_id uuid,
  cover_url text,
  audio_url text,
  duration_seconds numeric,
  license_status public.music_license_status,
  license_info text,
  publication_status public.music_publication_status,
  is_trending boolean,
  is_featured boolean,
  is_editor_pick boolean,
  sort_order integer,
  usage_count integer,
  view_count integer,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  audio_storage_path text,
  cover_storage_path text,
  period_usage_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_interval interval;
begin
  v_interval := case p_period
    when '24h' then interval '24 hours'
    when '30d' then interval '30 days'
    else interval '7 days'
  end;

  return query
  select
    t.*,
    count(u.id)::bigint as period_usage_count
  from public.music_tracks t
  join public.music_track_usages u on u.track_id = t.id
  where t.publication_status = 'active'
    and t.license_status = 'licensed'
    and u.created_at > now() - v_interval
  group by t.id
  order by period_usage_count desc, t.usage_count desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

-- Kullanım kaydı RPC
create or replace function public.record_music_usage(
  p_track_id uuid,
  p_post_id uuid default null,
  p_reel_id uuid default null,
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
  v_track public.music_tracks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_track from public.music_tracks where id = p_track_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_track.publication_status <> 'active' or v_track.license_status <> 'licensed' then
    raise exception 'Bu müzik kullanılamaz';
  end if;

  insert into public.music_track_usages (
    track_id, user_id, post_id, reel_id,
    music_start_sec, music_end_sec, music_volume, original_audio_volume
  )
  values (
    p_track_id, auth.uid(), p_post_id, p_reel_id,
    p_music_start_sec, p_music_end_sec, p_music_volume, p_original_audio_volume
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.search_music_tracks(text, integer) to authenticated, anon;
grant execute on function public.get_trending_music_tracks(text, integer) to authenticated, anon;
grant execute on function public.record_music_usage(uuid, uuid, uuid, numeric, numeric, numeric, numeric) to authenticated;

-- RLS
alter table public.music_categories enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_track_usages enable row level security;
alter table public.user_recent_music enable row level security;

create policy music_categories_public_read on public.music_categories
  for select using (is_active = true or public.is_moderator());

create policy music_categories_admin_write on public.music_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy music_tracks_public_read on public.music_tracks
  for select using (
    (publication_status = 'active' and license_status = 'licensed')
    or public.is_moderator()
  );

create policy music_tracks_admin_write on public.music_tracks
  for all using (public.is_admin()) with check (public.is_admin());

create policy music_track_usages_self_read on public.music_track_usages
  for select using (auth.uid() = user_id or public.is_moderator());

create policy music_track_usages_self_insert on public.music_track_usages
  for insert with check (auth.uid() = user_id);

create policy user_recent_music_self on public.user_recent_music
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-library',
  'music-library',
  true,
  15728640,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/m4a', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Müzik kütüphanesi herkese açık"
on storage.objects for select
using (bucket_id = 'music-library');

create policy "Admin müzik yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'music-library'
  and public.is_admin()
);

create policy "Admin müzik güncelleyebilir"
on storage.objects for update
to authenticated
using (bucket_id = 'music-library' and public.is_admin());

create policy "Admin müzik silebilir"
on storage.objects for delete
to authenticated
using (bucket_id = 'music-library' and public.is_admin());

-- Varsayılan kategoriler
insert into public.music_categories (slug, label, sort_order) values
  ('pop', 'Pop', 1),
  ('rap', 'Rap', 2),
  ('arabesk', 'Arabesk', 3),
  ('karadeniz', 'Karadeniz', 4),
  ('slow', 'Slow', 5),
  ('rock', 'Rock', 6),
  ('elektronik', 'Elektronik', 7),
  ('dugun', 'Düğün', 8),
  ('spor', 'Spor', 9),
  ('motivasyon', 'Motivasyon', 10),
  ('trend', 'Trend', 11),
  ('vlog', 'Vlog', 12),
  ('instrumental', 'Enstrümantal', 13)
on conflict (slug) do nothing;

-- Örnek lisanslı parçalar (Pixabay — admin panelden yönetilebilir)
insert into public.music_tracks (
  title, display_title, artist, category_id, audio_url, duration_seconds,
  license_status, license_info, publication_status, is_featured, sort_order
)
select
  v.title,
  v.display_title,
  v.artist,
  c.id,
  v.audio_url,
  v.duration_seconds,
  'licensed'::public.music_license_status,
  'Pixabay License',
  'active'::public.music_publication_status,
  v.is_featured,
  v.sort_order
from (values
  ('Pulse Rise', 'Pulse Rise', 'Vora Music', 'trend', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749bf48.mp3', 58, true, 1),
  ('Breaking News', 'Breaking News', 'Vora Music', 'trend', 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3', 45, false, 2),
  ('Sunny Walk', 'Sunny Walk', 'Vora Music', 'vlog', 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', 72, false, 3),
  ('Horon Ritmi', 'Horon Ritmi', 'Karadeniz', 'karadeniz', 'https://cdn.pixabay.com/download/audio/2023/10/30/audio_0a7c5e8f2d.mp3', 60, true, 4),
  ('Calm Strings', 'Calm Strings', 'Vora Music', 'instrumental', 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13a693c.mp3', 90, false, 5)
) as v(title, display_title, artist, cat_slug, audio_url, duration_seconds, is_featured, sort_order)
join public.music_categories c on c.slug = v.cat_slug
where not exists (select 1 from public.music_tracks limit 1);
