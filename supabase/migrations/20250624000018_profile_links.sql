-- Profil sosyal medya ve web sitesi bağlantıları

create type public.profile_link_kind as enum ('social', 'website');

create type public.profile_social_platform as enum (
  'instagram',
  'x',
  'facebook',
  'youtube',
  'tiktok',
  'linkedin',
  'github',
  'whatsapp',
  'telegram',
  'snapchat',
  'pinterest',
  'spotify',
  'threads'
);

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.profile_link_kind not null,
  platform public.profile_social_platform,
  url text not null,
  title text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_links_url_length check (char_length(trim(url)) between 1 and 500),
  constraint profile_links_title_length check (
    title is null or char_length(trim(title)) between 1 and 80
  ),
  constraint profile_links_social_requires_platform check (
    kind = 'website' or platform is not null
  ),
  constraint profile_links_website_no_platform check (
    kind = 'social' or platform is null
  )
);

create index profile_links_user_sort_idx on public.profile_links (user_id, sort_order, created_at);
create unique index profile_links_user_platform_unique
  on public.profile_links (user_id, platform)
  where kind = 'social';

alter table public.profile_links enable row level security;

create policy profile_links_select on public.profile_links
  for select
  using (
    auth.uid() = user_id
    or public.can_view_profile_row(user_id)
  );

create policy profile_links_insert on public.profile_links
  for insert
  with check (auth.uid() = user_id);

create policy profile_links_update on public.profile_links
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profile_links_delete on public.profile_links
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_links to authenticated;
