-- Reel yorumları: yanıt, beğeni, sayaç

alter table public.reels
  add column if not exists comment_count integer not null default 0;

create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.reel_comments (id) on delete cascade,
  content text not null,
  like_count integer not null default 0,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reel_comments_reel_created_idx
  on public.reel_comments (reel_id, created_at asc);
create index if not exists reel_comments_parent_idx
  on public.reel_comments (parent_id);

create table if not exists public.reel_comment_likes (
  comment_id uuid not null references public.reel_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create or replace function public.sync_reel_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels set comment_count = comment_count + 1 where id = new.reel_id;
  elsif tg_op = 'DELETE' then
    update public.reels set comment_count = greatest(comment_count - 1, 0) where id = old.reel_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reel_comments_count_sync on public.reel_comments;
create trigger reel_comments_count_sync
  after insert or delete on public.reel_comments
  for each row execute function public.sync_reel_comment_count();

create or replace function public.sync_reel_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reel_comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.reel_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reel_comment_likes_count_sync on public.reel_comment_likes;
create trigger reel_comment_likes_count_sync
  after insert or delete on public.reel_comment_likes
  for each row execute function public.sync_reel_comment_like_count();

drop trigger if exists reel_comments_updated_at on public.reel_comments;
create trigger reel_comments_updated_at
  before update on public.reel_comments
  for each row execute function public.set_updated_at();

alter table public.reel_comments enable row level security;
alter table public.reel_comment_likes enable row level security;

drop policy if exists "reel_comments_public_read" on public.reel_comments;
create policy "reel_comments_public_read" on public.reel_comments
  for select using (true);

drop policy if exists "reel_comments_author_insert" on public.reel_comments;
create policy "reel_comments_author_insert" on public.reel_comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "reel_comments_author_update" on public.reel_comments;
create policy "reel_comments_author_update" on public.reel_comments
  for update using (auth.uid() = author_id);

drop policy if exists "reel_comments_author_delete" on public.reel_comments;
create policy "reel_comments_author_delete" on public.reel_comments
  for delete using (auth.uid() = author_id);

drop policy if exists "reel_comment_likes_public_read" on public.reel_comment_likes;
create policy "reel_comment_likes_public_read" on public.reel_comment_likes
  for select using (true);

drop policy if exists "reel_comment_likes_self_insert" on public.reel_comment_likes;
create policy "reel_comment_likes_self_insert" on public.reel_comment_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "reel_comment_likes_self_delete" on public.reel_comment_likes;
create policy "reel_comment_likes_self_delete" on public.reel_comment_likes
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.reel_comments to authenticated;
grant select, insert, delete on public.reel_comment_likes to authenticated;
