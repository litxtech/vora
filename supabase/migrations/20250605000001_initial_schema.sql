-- KARADENİZ DİJİTAL AĞI — Temel şema
-- Her modül kendi tablosunda, temiz ve bağımsız yapı

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- Enums
create type public.user_role as enum (
  'user',
  'verified_reporter',
  'moderator',
  'admin',
  'super_admin'
);

create type public.content_status as enum (
  'draft',
  'published',
  'hidden',
  'removed'
);

create type public.video_status as enum (
  'uploading',
  'processing',
  'ready',
  'failed'
);

create type public.incident_severity as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.incident_status as enum (
  'open',
  'verified',
  'resolved',
  'dismissed'
);

create type public.job_type as enum (
  'full_time',
  'part_time',
  'seasonal',
  'remote'
);

create type public.lost_item_type as enum (
  'lost',
  'found'
);

create type public.lost_item_status as enum (
  'open',
  'resolved'
);

create type public.conversation_type as enum (
  'direct',
  'group'
);

create type public.moderation_action_type as enum (
  'warn',
  'hide',
  'remove',
  'ban'
);

-- Bölgeler
create table public.regions (
  id text primary key,
  name text not null,
  phase smallint not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.regions (id, name, phase) values
  ('trabzon', 'Trabzon', 1),
  ('rize', 'Rize', 1),
  ('giresun', 'Giresun', 1),
  ('ordu', 'Ordu', 2),
  ('samsun', 'Samsun', 2),
  ('artvin', 'Artvin', 2)
on conflict (id) do nothing;

-- Profiller (auth.users ile bağlı)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  region_id text references public.regions (id),
  role public.user_role not null default 'user',
  is_verified boolean not null default false,
  is_premium boolean not null default false,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_region_id_idx on public.profiles (region_id);
create index profiles_role_idx on public.profiles (role);

-- Canlı Akış / Haber
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text,
  content text not null,
  media_urls text[] not null default '{}',
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  status public.content_status not null default 'published',
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_region_created_idx on public.posts (region_id, created_at desc);
create index posts_author_idx on public.posts (author_id);

-- Olay Bildirimi
create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text not null,
  description text not null,
  media_urls text[] not null default '{}',
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  severity public.incident_severity not null default 'medium',
  status public.incident_status not null default 'open',
  created_at timestamptz not null default now()
);

create index incident_reports_region_idx on public.incident_reports (region_id, created_at desc);

-- Video (Mux)
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text,
  description text,
  mux_asset_id text,
  mux_playback_id text,
  mux_upload_id text,
  duration_seconds integer,
  status public.video_status not null default 'uploading',
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create index videos_owner_idx on public.videos (owner_id);
create index videos_mux_asset_idx on public.videos (mux_asset_id);

-- Reels
create table public.reels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  video_id uuid not null references public.videos (id) on delete cascade,
  caption text,
  like_count integer not null default 0,
  view_count integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index reels_region_created_idx on public.reels (region_id, created_at desc);

-- İşletmeler
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  name text not null,
  category text not null,
  description text,
  phone text,
  address text,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  logo_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index businesses_region_idx on public.businesses (region_id);

-- İş İlanları
create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text not null,
  description text not null,
  job_type public.job_type not null default 'full_time',
  salary_range text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index job_listings_region_idx on public.job_listings (region_id, created_at desc);

-- Personel Merkezi
create table public.staff_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text not null,
  description text not null,
  positions text[] not null default '{}',
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

-- Etkinlikler
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  cover_url text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index events_region_starts_idx on public.events (region_id, starts_at);

-- Kayıp Merkezi
create table public.lost_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  item_type public.lost_item_type not null,
  title text not null,
  description text not null,
  contact_info text,
  media_urls text[] not null default '{}',
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  status public.lost_item_status not null default 'open',
  created_at timestamptz not null default now()
);

-- Mesajlaşma
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  media_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

-- Moderasyon
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action public.moderation_action_type not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Otomatik profil oluşturma
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.incident_reports enable row level security;
alter table public.videos enable row level security;
alter table public.reels enable row level security;
alter table public.businesses enable row level security;
alter table public.job_listings enable row level security;
alter table public.staff_requests enable row level security;
alter table public.events enable row level security;
alter table public.lost_items enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.regions enable row level security;

-- Temel politikalar (detaylar modül bazında genişletilecek)
create policy "regions_public_read" on public.regions for select using (true);

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

create policy "posts_public_read" on public.posts
  for select using (status = 'published');
create policy "posts_author_insert" on public.posts
  for insert with check (auth.uid() = author_id);
create policy "posts_author_update" on public.posts
  for update using (auth.uid() = author_id);

create policy "messages_member_read" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );
create policy "messages_member_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );
