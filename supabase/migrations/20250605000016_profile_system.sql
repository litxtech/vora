-- Bölüm 7 — Profil sistemi: güven puanı, rozetler, başarımlar, profil görüntülemeleri

-- Gizlilik seviyesi
create type public.profile_visibility as enum (
  'public',
  'members',
  'friends'
);

-- Rozet türleri
create type public.badge_type as enum (
  'verified_account',
  'reporter',
  'trusted_contributor',
  'business',
  'moderator',
  'admin'
);

-- Profil genişletmeleri
alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists trust_score smallint not null default 100,
  add column if not exists reporter_level smallint not null default 1,
  add column if not exists contribution_score integer not null default 0,
  add column if not exists verified_content_count integer not null default 0,
  add column if not exists profile_visibility public.profile_visibility not null default 'public',
  add column if not exists show_profile_views boolean not null default true,
  add column if not exists show_liked_posts boolean not null default false;

alter table public.profiles
  add constraint profiles_trust_score_range check (trust_score between 0 and 1000),
  add constraint profiles_reporter_level_range check (reporter_level between 1 and 5);

-- Profil görüntülemeleri
create table public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index profile_views_profile_created_idx on public.profile_views (profile_id, created_at desc);
create index profile_views_viewer_idx on public.profile_views (viewer_id, created_at desc);

-- Kazanılan rozetler
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_type public.badge_type not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type)
);

create index user_badges_user_idx on public.user_badges (user_id);

-- Başarımlar
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index user_achievements_user_idx on public.user_achievements (user_id);

-- Yakın arkadaşlar
create table public.close_friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint close_friends_no_self check (user_id <> friend_id)
);

create index close_friends_user_idx on public.close_friends (user_id);

-- RLS
alter table public.profile_views enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_achievements enable row level security;
alter table public.close_friends enable row level security;

-- Profil görüntülemeleri
create policy "profile_views_self_insert" on public.profile_views
  for insert with check (viewer_id is null or auth.uid() = viewer_id);

create policy "profile_views_owner_read" on public.profile_views
  for select using (
    auth.uid() = profile_id
    or auth.uid() = viewer_id
  );

-- Rozetler — herkese okunur
create policy "user_badges_public_read" on public.user_badges
  for select using (true);

-- Başarımlar — herkese okunur
create policy "user_achievements_public_read" on public.user_achievements
  for select using (true);

-- Yakın arkadaşlar — sadece sahibi
create policy "close_friends_self_all" on public.close_friends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mevcut kullanıcılara rol bazlı rozet ata
insert into public.user_badges (user_id, badge_type)
select id, 'verified_account' from public.profiles where is_verified = true
on conflict do nothing;

insert into public.user_badges (user_id, badge_type)
select id, 'reporter' from public.profiles where role = 'verified_reporter'
on conflict do nothing;

insert into public.user_badges (user_id, badge_type)
select id, 'moderator' from public.profiles where role in ('moderator', 'admin', 'super_admin')
on conflict do nothing;

insert into public.user_badges (user_id, badge_type)
select id, 'admin' from public.profiles where role in ('admin', 'super_admin')
on conflict do nothing;

insert into public.user_badges (user_id, badge_type)
select id, 'business' from public.profiles where account_type = 'business'
on conflict do nothing;

insert into public.user_badges (user_id, badge_type)
select id, 'trusted_contributor' from public.profiles where trust_score >= 200
on conflict do nothing;
