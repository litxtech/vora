-- Story (hikâye) — platform geneli, 24 saat TTL

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  region_id text,
  audience text not null default 'public'
    check (audience in ('public', 'followers', 'close_friends')),
  status text not null default 'published'
    check (status in ('pending_review', 'published', 'removed', 'archived')),
  expires_at timestamptz not null,
  item_count int not null default 0,
  latest_thumb_url text,
  latest_item_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  sort_order int not null default 0,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  thumb_url text,
  duration_sec numeric,
  sticker_category text,
  stickers_json jsonb not null default '[]'::jsonb,
  status text not null default 'published'
    check (status in ('pending_review', 'published', 'removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  watched_seconds numeric not null default 0,
  watch_completion numeric not null default 0,
  navigation text
    check (navigation is null or navigation in (
      'auto_forward', 'tap_forward', 'tap_back', 'swipe_forward', 'swipe_back', 'manual_close'
    )),
  exited_early boolean not null default false,
  viewed_at timestamptz not null default now(),
  unique (story_item_id, viewer_id)
);

create table if not exists public.story_reactions (
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  primary key (story_item_id, user_id)
);

create index if not exists stories_active_rings_idx
  on public.stories (latest_item_at desc nulls last)
  where status = 'published';

create index if not exists stories_author_active_idx
  on public.stories (author_id, expires_at desc)
  where status = 'published';

create index if not exists story_items_story_order_idx
  on public.story_items (story_id, sort_order asc);

create index if not exists story_views_story_idx
  on public.story_views (story_id, viewed_at desc);

create index if not exists story_views_item_idx
  on public.story_views (story_item_id);

-- Denormalize story bundle on item insert
create or replace function public.sync_story_bundle_on_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stories s
  set
    item_count = (
      select count(*)::int
      from public.story_items si
      where si.story_id = new.story_id
        and si.status = 'published'
        and si.expires_at > now()
    ),
    latest_thumb_url = coalesce(new.thumb_url, new.media_url),
    latest_item_at = new.created_at,
    updated_at = now()
  where s.id = new.story_id;
  return new;
end;
$$;

drop trigger if exists story_items_sync_bundle on public.story_items;
create trigger story_items_sync_bundle
  after insert or update on public.story_items
  for each row execute function public.sync_story_bundle_on_item();

-- RLS
alter table public.stories enable row level security;
alter table public.story_items enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;

create policy stories_select_published on public.stories
  for select using (
    status = 'published'
    and expires_at > now()
    and (
      author_id = auth.uid()
      or audience = 'public'
    )
  );

create policy stories_insert_own on public.stories
  for insert with check (author_id = auth.uid());

create policy stories_update_own on public.stories
  for update using (author_id = auth.uid());

create policy story_items_select_published on public.story_items
  for select using (
    status = 'published'
    and expires_at > now()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and s.status = 'published'
        and s.expires_at > now()
        and (s.author_id = auth.uid() or s.audience = 'public')
    )
  );

create policy story_items_insert_own on public.story_items
  for insert with check (author_id = auth.uid());

create policy story_views_select on public.story_views
  for select using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

create policy story_views_upsert_own on public.story_views
  for insert with check (viewer_id = auth.uid());

create policy story_views_update_own on public.story_views
  for update using (viewer_id = auth.uid());

create policy story_reactions_select on public.story_reactions
  for select using (true);

create policy story_reactions_upsert_own on public.story_reactions
  for insert with check (user_id = auth.uid());

create policy story_reactions_update_own on public.story_reactions
  for update using (user_id = auth.uid());

-- Block filter helper
create or replace function public.is_story_blocked(p_viewer uuid, p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id = p_viewer and ub.blocked_id = p_author and ub.is_restricted = false)
       or (ub.blocker_id = p_author and ub.blocked_id = p_viewer and ub.is_restricted = false)
  )
  or exists (
    select 1 from public.user_mutes um
    where um.muter_id = p_viewer and um.muted_id = p_author
  );
$$;

-- Active story rings (platform geneli)
create or replace function public.get_story_rings(
  p_viewer_id uuid,
  p_cursor timestamptz default null,
  p_limit int default 40,
  p_region_id text default null
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  story_id uuid,
  item_count int,
  preview_thumb text,
  latest_item_at timestamptz,
  has_unseen boolean,
  region_id text
)
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select
      s.id as story_id,
      s.author_id,
      s.item_count,
      s.latest_thumb_url,
      s.latest_item_at,
      s.region_id
    from public.stories s
    join public.profiles p on p.id = s.author_id
    where s.status = 'published'
      and s.expires_at > now()
      and s.item_count > 0
      and s.audience = 'public'
      and p.account_status = 'active'
      and (p_region_id is null or s.region_id = p_region_id or s.region_id is null)
      and (p_cursor is null or s.latest_item_at < p_cursor)
      and (p_viewer_id is null or not public.is_story_blocked(p_viewer_id, s.author_id))
  )
  select
    a.author_id as user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    coalesce(pr.is_verified, false) as is_verified,
    a.story_id,
    a.item_count,
    a.latest_thumb_url as preview_thumb,
    a.latest_item_at,
    case
      when p_viewer_id is null then true
      when a.author_id = p_viewer_id then false
      else not exists (
        select 1
        from public.story_items si
        join public.story_views sv on sv.story_item_id = si.id and sv.viewer_id = p_viewer_id
        where si.story_id = a.story_id
          and si.status = 'published'
          and si.expires_at > now()
      )
    end as has_unseen,
    a.region_id
  from active a
  join public.profiles pr on pr.id = a.author_id
  order by a.latest_item_at desc
  limit greatest(1, least(p_limit, 60));
$$;

create or replace function public.get_story_bundle(
  p_viewer_id uuid,
  p_author_id uuid
)
returns table (
  story_id uuid,
  author_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  item_id uuid,
  sort_order int,
  media_type text,
  media_url text,
  thumb_url text,
  duration_sec numeric,
  sticker_category text,
  created_at timestamptz,
  has_reacted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as story_id,
    s.author_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    coalesce(pr.is_verified, false) as is_verified,
    si.id as item_id,
    si.sort_order,
    si.media_type,
    si.media_url,
    si.thumb_url,
    si.duration_sec,
    si.sticker_category,
    si.created_at,
    case
      when p_viewer_id is null then false
      else exists (
        select 1 from public.story_reactions sr
        where sr.story_item_id = si.id and sr.user_id = p_viewer_id
      )
    end as has_reacted
  from public.stories s
  join public.profiles pr on pr.id = s.author_id
  join public.story_items si on si.story_id = s.id
  where s.author_id = p_author_id
    and s.status = 'published'
    and s.expires_at > now()
    and si.status = 'published'
    and si.expires_at > now()
    and (p_viewer_id is null or not public.is_story_blocked(p_viewer_id, s.author_id))
  order by si.sort_order asc, si.created_at asc;
$$;

create or replace function public.record_story_view(
  p_viewer_id uuid,
  p_story_item_id uuid,
  p_watched_seconds numeric,
  p_watch_completion numeric,
  p_navigation text,
  p_exited_early boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story_id uuid;
  v_author_id uuid;
begin
  select si.story_id, si.author_id
  into v_story_id, v_author_id
  from public.story_items si
  where si.id = p_story_item_id;

  if v_story_id is null then
    return;
  end if;

  if public.is_story_blocked(p_viewer_id, v_author_id) then
    return;
  end if;

  insert into public.story_views (
    story_item_id, story_id, viewer_id,
    watched_seconds, watch_completion, navigation, exited_early, viewed_at
  )
  values (
    p_story_item_id, v_story_id, p_viewer_id,
    greatest(0, p_watched_seconds), least(1, greatest(0, p_watch_completion)),
    p_navigation, coalesce(p_exited_early, false), now()
  )
  on conflict (story_item_id, viewer_id) do update set
    watched_seconds = greatest(story_views.watched_seconds, excluded.watched_seconds),
    watch_completion = greatest(story_views.watch_completion, excluded.watch_completion),
    navigation = coalesce(excluded.navigation, story_views.navigation),
    exited_early = story_views.exited_early or excluded.exited_early,
    viewed_at = now();

  update public.stories
  set view_count = (
    select count(distinct viewer_id)::int from public.story_views where story_id = v_story_id
  )
  where id = v_story_id;
end;
$$;

create or replace function public.get_story_insights(
  p_author_id uuid,
  p_story_id uuid
)
returns table (
  story_id uuid,
  total_views int,
  unique_viewers int,
  item_id uuid,
  sort_order int,
  thumb_url text,
  media_type text,
  item_views int,
  avg_watched_seconds numeric,
  avg_completion numeric,
  tap_forward_count int,
  tap_back_count int,
  swipe_forward_count int,
  swipe_back_count int,
  auto_forward_count int,
  exited_early_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as story_id,
    s.view_count as total_views,
    (select count(distinct sv.viewer_id)::int from public.story_views sv where sv.story_id = s.id) as unique_viewers,
    si.id as item_id,
    si.sort_order,
    coalesce(si.thumb_url, si.media_url) as thumb_url,
    si.media_type,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id) as item_views,
    coalesce((select avg(sv.watched_seconds) from public.story_views sv where sv.story_item_id = si.id), 0) as avg_watched_seconds,
    coalesce((select avg(sv.watch_completion) from public.story_views sv where sv.story_item_id = si.id), 0) as avg_completion,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'tap_forward') as tap_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'tap_back') as tap_back_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'swipe_forward') as swipe_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'swipe_back') as swipe_back_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'auto_forward') as auto_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.exited_early) as exited_early_count
  from public.stories s
  join public.story_items si on si.story_id = s.id
  where s.id = p_story_id
    and s.author_id = p_author_id
    and s.author_id = auth.uid()
  order by si.sort_order asc;
$$;

grant execute on function public.get_story_rings(uuid, timestamptz, int, text) to authenticated, anon;
grant execute on function public.get_story_bundle(uuid, uuid) to authenticated, anon;
grant execute on function public.record_story_view(uuid, uuid, numeric, numeric, text, boolean) to authenticated;
grant execute on function public.get_story_insights(uuid, uuid) to authenticated;
grant execute on function public.is_story_blocked(uuid, uuid) to authenticated;
