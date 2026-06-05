-- Canlı Akış — etkileşim, takip, hashtag ve raporlama tabloları

-- Kategoriler
create type public.post_category as enum (
  'general',
  'news',
  'emergency',
  'traffic',
  'event',
  'job',
  'business',
  'lost_found'
);

create type public.post_type as enum (
  'post',
  'incident',
  'quote',
  'reel'
);

create type public.report_reason as enum (
  'spam',
  'harassment',
  'fraud',
  'abuse',
  'misinformation',
  'child_safety',
  'violence'
);

-- Gönderi genişletmeleri
alter table public.posts
  add column if not exists category public.post_category not null default 'general',
  add column if not exists district text,
  add column if not exists location_label text,
  add column if not exists post_type public.post_type not null default 'post',
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists quote_count integer not null default 0,
  add column if not exists save_count integer not null default 0,
  add column if not exists quoted_post_id uuid references public.posts (id) on delete set null,
  add column if not exists incident_id uuid references public.incident_reports (id) on delete set null;

create index if not exists posts_category_created_idx on public.posts (category, created_at desc);
create index if not exists posts_district_idx on public.posts (region_id, district);
create index if not exists posts_quoted_post_idx on public.posts (quoted_post_id);

-- Takip
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- Beğeni
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id, created_at desc);

-- Yorumlar
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.post_comments (id) on delete cascade,
  content text not null,
  like_count integer not null default 0,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_comments_post_created_idx on public.post_comments (post_id, created_at asc);
create index post_comments_parent_idx on public.post_comments (parent_id);

-- Yorum beğenileri
create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Kaydetme koleksiyonları
create table public.save_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index save_collections_user_idx on public.save_collections (user_id);

-- Kaydedilen gönderiler
create table public.post_saves (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid references public.save_collections (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_saves_user_idx on public.post_saves (user_id, created_at desc);

-- Görüntüleme kayıtları
create table public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_id uuid references public.profiles (id) on delete set null,
  is_unique boolean not null default true,
  created_at timestamptz not null default now()
);

create index post_views_post_created_idx on public.post_views (post_id, created_at desc);
create index post_views_viewer_idx on public.post_views (viewer_id, created_at desc);

-- Hashtag
create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null,
  post_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_hashtags (
  post_id uuid not null references public.posts (id) on delete cascade,
  hashtag_id uuid not null references public.hashtags (id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- İçerik raporları
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now()
);

create index content_reports_target_idx on public.content_reports (target_type, target_id);

-- Engelleme / kısıtlama
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  is_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

-- Sayaç tetikleyicileri
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger post_likes_count_sync
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger post_comments_count_sync
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comment_count();

create or replace function public.sync_post_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set save_count = save_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set save_count = greatest(save_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger post_saves_count_sync
  after insert or delete on public.post_saves
  for each row execute function public.sync_post_save_count();

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.post_comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.post_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger comment_likes_count_sync
  after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_like_count();

create trigger post_comments_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.save_collections enable row level security;
alter table public.post_saves enable row level security;
alter table public.post_views enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.content_reports enable row level security;
alter table public.user_blocks enable row level security;

-- Reels / videos okuma politikaları
create policy "videos_public_read" on public.videos
  for select using (status = 'ready');
create policy "videos_owner_insert" on public.videos
  for insert with check (auth.uid() = owner_id);
create policy "videos_owner_update" on public.videos
  for update using (auth.uid() = owner_id);

create policy "reels_public_read" on public.reels
  for select using (status = 'published');
create policy "reels_author_insert" on public.reels
  for insert with check (auth.uid() = author_id);
create policy "reels_author_update" on public.reels
  for update using (auth.uid() = author_id);

-- Takip
create policy "follows_public_read" on public.follows for select using (true);
create policy "follows_self_insert" on public.follows
  for insert with check (auth.uid() = follower_id);
create policy "follows_self_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- Beğeni
create policy "post_likes_public_read" on public.post_likes for select using (true);
create policy "post_likes_self_insert" on public.post_likes
  for insert with check (auth.uid() = user_id);
create policy "post_likes_self_delete" on public.post_likes
  for delete using (auth.uid() = user_id);

-- Yorumlar
create policy "post_comments_public_read" on public.post_comments for select using (true);
create policy "post_comments_author_insert" on public.post_comments
  for insert with check (auth.uid() = author_id);
create policy "post_comments_author_update" on public.post_comments
  for update using (auth.uid() = author_id);
create policy "post_comments_author_delete" on public.post_comments
  for delete using (auth.uid() = author_id);

-- Yorum beğenileri
create policy "comment_likes_public_read" on public.comment_likes for select using (true);
create policy "comment_likes_self_insert" on public.comment_likes
  for insert with check (auth.uid() = user_id);
create policy "comment_likes_self_delete" on public.comment_likes
  for delete using (auth.uid() = user_id);

-- Kaydetme
create policy "save_collections_self_all" on public.save_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "post_saves_self_read" on public.post_saves
  for select using (auth.uid() = user_id);
create policy "post_saves_self_insert" on public.post_saves
  for insert with check (auth.uid() = user_id);
create policy "post_saves_self_delete" on public.post_saves
  for delete using (auth.uid() = user_id);

-- Görüntüleme
create policy "post_views_self_insert" on public.post_views
  for insert with check (viewer_id is null or auth.uid() = viewer_id);
create policy "post_views_author_read" on public.post_views
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_views.post_id and p.author_id = auth.uid()
    )
    or auth.uid() = viewer_id
  );

-- Hashtag
create policy "hashtags_public_read" on public.hashtags for select using (true);
create policy "post_hashtags_public_read" on public.post_hashtags for select using (true);
create policy "post_hashtags_author_insert" on public.post_hashtags
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_hashtags.post_id and p.author_id = auth.uid()
    )
  );

-- Raporlama
create policy "content_reports_self_insert" on public.content_reports
  for insert with check (auth.uid() = reporter_id);
create policy "content_reports_self_read" on public.content_reports
  for select using (auth.uid() = reporter_id);

-- Engelleme
create policy "user_blocks_self_all" on public.user_blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Realtime
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.post_likes;
