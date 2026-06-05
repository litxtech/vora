-- Reel beğenileri + Olay thread tabloları

create table public.reel_likes (
  reel_id uuid not null references public.reels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create index reel_likes_user_idx on public.reel_likes (user_id, created_at desc);

create or replace function public.sync_reel_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels set like_count = like_count + 1 where id = new.reel_id;
  elsif tg_op = 'DELETE' then
    update public.reels set like_count = greatest(like_count - 1, 0) where id = old.reel_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger reel_likes_count_sync
  after insert or delete on public.reel_likes
  for each row execute function public.sync_reel_like_count();

alter table public.reel_likes enable row level security;

create policy "reel_likes_public_read" on public.reel_likes for select using (true);
create policy "reel_likes_self_insert" on public.reel_likes
  for insert with check (auth.uid() = user_id);
create policy "reel_likes_self_delete" on public.reel_likes
  for delete using (auth.uid() = user_id);

-- Olay thread
create type public.incident_update_type as enum (
  'initial',
  'update',
  'photo',
  'video',
  'verification'
);

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incident_reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  update_type public.incident_update_type not null default 'update',
  content text not null,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index incident_updates_incident_idx on public.incident_updates (incident_id, created_at asc);

create table public.incident_verifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incident_reports (id) on delete cascade,
  verifier_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (incident_id, verifier_id)
);

create index incident_verifications_incident_idx on public.incident_verifications (incident_id);

alter table public.incident_updates enable row level security;
alter table public.incident_verifications enable row level security;

create policy "incident_updates_public_read" on public.incident_updates for select using (true);
create policy "incident_updates_author_insert" on public.incident_updates
  for insert with check (auth.uid() = author_id);

create policy "incident_verifications_public_read" on public.incident_verifications for select using (true);
create policy "incident_verifications_self_insert" on public.incident_verifications
  for insert with check (auth.uid() = verifier_id);

alter publication supabase_realtime add table public.incident_updates;
