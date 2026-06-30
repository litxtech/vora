-- Bölüm 23 — Topluluklar

create type public.community_member_role as enum ('owner', 'admin', 'moderator', 'member');
create type public.community_visibility as enum ('public', 'private');

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  cover_url text,
  icon_url text,
  region_id text references public.regions (id),
  category text not null default 'general',
  visibility public.community_visibility not null default 'public',
  member_count integer not null default 0,
  post_count integer not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  rules_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index communities_region_idx on public.communities (region_id, member_count desc);
create index communities_category_idx on public.communities (category);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.community_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_members_user_idx on public.community_members (user_id, joined_at desc);

create table public.community_rules (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title text not null,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index community_rules_community_idx on public.community_rules (community_id, sort_order);

alter table public.posts
  add column if not exists community_id uuid references public.communities (id) on delete set null;

create index if not exists posts_community_idx on public.posts (community_id, created_at desc)
  where community_id is not null;

alter table public.events
  add column if not exists community_id uuid references public.communities (id) on delete set null;

-- Üye sayacı
create or replace function public.sync_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger community_members_count_sync
  after insert or delete on public.community_members
  for each row execute function public.sync_community_member_count();

create trigger communities_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();

-- RLS
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_rules enable row level security;

create policy "communities_public_read" on public.communities
  for select to anon, authenticated
  using (visibility = 'public' or created_by = auth.uid() or exists (
    select 1 from public.community_members cm
    where cm.community_id = id and cm.user_id = auth.uid()
  ));

create policy "communities_authenticated_create" on public.communities
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "communities_admin_update" on public.communities
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

create policy "community_members_read" on public.community_members
  for select to authenticated using (true);

create policy "community_members_join" on public.community_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "community_members_leave" on public.community_members
  for delete to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.community_members cm
    where cm.community_id = community_members.community_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ));

create policy "community_rules_read" on public.community_rules
  for select to anon, authenticated using (true);

create policy "community_rules_admin_write" on public.community_rules
  for all to authenticated
  using (exists (
    select 1 from public.community_members cm
    where cm.community_id = community_rules.community_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin', 'moderator')
  ));
