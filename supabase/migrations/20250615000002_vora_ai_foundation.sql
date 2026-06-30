-- Vora AI — temel şema, @VoraAI sistem hesabı, modül ayarları
-- Idempotent: kısmen uygulanmış uzak DB ile uyumlu

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists is_ai_account boolean not null default false;

create table if not exists public.ai_settings (
  module text primary key,
  label text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  memory_key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, memory_key)
);

create index if not exists ai_memories_user_idx on public.ai_memories (user_id, updated_at desc);

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  action text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  provider text not null default 'vora',
  created_at timestamptz not null default now(),
  unique (target_type, target_id, action)
);

create index if not exists ai_summaries_target_idx on public.ai_summaries (target_type, target_id, created_at desc);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rec_type text not null,
  payload jsonb not null default '{}'::jsonb,
  score numeric(6, 3) not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_recommendations_user_idx on public.ai_recommendations (user_id, rec_type, created_at desc);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  query text not null,
  results jsonb not null default '[]'::jsonb,
  region_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_events_user_idx on public.ai_events (user_id, created_at desc);

create table if not exists public.ai_map_data (
  id uuid primary key default gen_random_uuid(),
  region_id text not null,
  data_type text not null,
  latitude double precision,
  longitude double precision,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_map_data_region_idx on public.ai_map_data (region_id, data_type, expires_at desc);
create index if not exists ai_map_data_geo_idx on public.ai_map_data (latitude, longitude) where latitude is not null;

create table if not exists public.ai_comment_threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  reel_id uuid,
  user_id uuid not null references public.profiles (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_comment_threads_user_idx on public.ai_comment_threads (user_id, updated_at desc);
create index if not exists ai_comment_threads_post_idx on public.ai_comment_threads (post_id);

insert into public.ai_settings (module, label, enabled) values
  ('posts', 'Gönderiler', true),
  ('reels', 'Reels', true),
  ('map', 'Harita', true),
  ('events', 'Etkinlik', true),
  ('comments', 'Yorumlar', true),
  ('moderation', 'Moderasyon', true),
  ('recommendations', 'Öneriler', true),
  ('news', 'Haber', true),
  ('trends', 'Trendler', true),
  ('map_animation', 'Harita Canlandırma', true)
on conflict (module) do nothing;

do $$
declare
  v_id uuid := 'f0000000-0000-4000-8000-00000000a101';
begin
  perform set_config('search_path', 'public, auth, extensions', true);

  if not exists (select 1 from auth.users where id = v_id) then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      v_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'voraai@system.karadeniz.local',
      extensions.crypt('vora-ai-no-login-' || v_id::text, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"VoraAI","full_name":"Vora AI","is_ai_account":true}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;

  insert into public.profiles (
    id, username, full_name, bio, role, is_verified, is_ai_account, onboarding_completed
  )
  values (
    v_id,
    'VoraAI',
    'Vora AI',
    'Karadeniz''in yapay zekâ destekli rehberi.',
    'user',
    true,
    true,
    true
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    bio = excluded.bio,
    is_ai_account = true,
    is_verified = true;
end $$;

alter table public.ai_settings enable row level security;
alter table public.ai_memories enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.ai_events enable row level security;
alter table public.ai_map_data enable row level security;
alter table public.ai_comment_threads enable row level security;

do $$ begin
  create policy ai_settings_read on public.ai_settings for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_settings_admin_write on public.ai_settings
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_memories_self on public.ai_memories
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_summaries_read on public.ai_summaries for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_recommendations_self on public.ai_recommendations
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_events_self on public.ai_events
    for select using (auth.uid() = user_id or user_id is null);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_map_data_read on public.ai_map_data for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_comment_threads_self on public.ai_comment_threads
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create or replace function public.admin_vora_ai_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'summaries', (select count(*)::int from public.ai_summaries),
    'memories', (select count(*)::int from public.ai_memories),
    'recommendations', (select count(*)::int from public.ai_recommendations),
    'map_data', (select count(*)::int from public.ai_map_data where expires_at > now()),
    'comment_threads', (select count(*)::int from public.ai_comment_threads)
  );
$$;

grant execute on function public.admin_vora_ai_stats() to authenticated;
