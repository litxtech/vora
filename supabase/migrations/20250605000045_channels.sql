-- Bölüm 24 — Kanal Sistemi (Telegram mantığı, tek yönlü yayın)

create type public.channel_type as enum ('news', 'municipality', 'emergency', 'business');

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  channel_type public.channel_type not null default 'news',
  region_id text references public.regions (id),
  business_id uuid references public.businesses (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  avatar_url text,
  subscriber_count integer not null default 0,
  post_count integer not null default 0,
  is_verified boolean not null default false,
  notify_subscribers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index channels_type_region_idx on public.channels (channel_type, region_id);
create index channels_subscriber_count_idx on public.channels (subscriber_count desc);

create table public.channel_subscribers (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  notify_enabled boolean not null default true,
  subscribed_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index channel_subscribers_user_idx on public.channel_subscribers (user_id, subscribed_at desc);

create table public.channel_admins (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  can_post boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  media_url text,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index channel_posts_channel_created_idx
  on public.channel_posts (channel_id, created_at desc);

-- Bildirim türü
alter type public.notification_event_type add value if not exists 'channel_post';

-- Abone sayacı
create or replace function public.sync_channel_subscriber_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.channels set subscriber_count = subscriber_count + 1 where id = new.channel_id;
  elsif tg_op = 'DELETE' then
    update public.channels set subscriber_count = greatest(subscriber_count - 1, 0) where id = old.channel_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger channel_subscribers_count_sync
  after insert or delete on public.channel_subscribers
  for each row execute function public.sync_channel_subscriber_count();

-- Gönderi sayacı
create or replace function public.sync_channel_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.channels set post_count = post_count + 1, updated_at = now() where id = new.channel_id;
  elsif tg_op = 'DELETE' then
    update public.channels set post_count = greatest(post_count - 1, 0), updated_at = now() where id = old.channel_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger channel_posts_count_sync
  after insert or delete on public.channel_posts
  for each row execute function public.sync_channel_post_count();

create trigger channels_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

-- Kanal yayını bildirimi
create or replace function public.notify_channel_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.channels%rowtype;
begin
  select * into v_channel from public.channels where id = new.channel_id;

  if not v_channel.notify_subscribers then
    return new;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cs.user_id,
    'channel_post'::public.notification_event_type,
    v_channel.name,
    left(new.content, 180),
    jsonb_build_object('channel_id', new.channel_id, 'post_id', new.id, 'channel_type', v_channel.channel_type),
    new.author_id
  from public.channel_subscribers cs
  join public.profiles p on p.id = cs.user_id
  where cs.channel_id = new.channel_id
    and cs.notify_enabled = true
    and cs.user_id <> new.author_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'channels')::boolean, true) = true;

  return new;
end;
$$;

create trigger channel_post_notify
  after insert on public.channel_posts
  for each row execute function public.notify_channel_subscribers();

-- RLS
alter table public.channels enable row level security;
alter table public.channel_subscribers enable row level security;
alter table public.channel_admins enable row level security;
alter table public.channel_posts enable row level security;

create policy "channels_public_read" on public.channels
  for select to anon, authenticated using (true);

create policy "channels_owner_insert" on public.channels
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "channels_admin_update" on public.channels
  for update to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.channel_admins ca
      where ca.channel_id = channels.id and ca.user_id = auth.uid()
    )
  );

create policy "channel_subscribers_read" on public.channel_subscribers
  for select to authenticated using (true);

create policy "channel_subscribers_self_manage" on public.channel_subscribers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "channel_admins_read" on public.channel_admins
  for select to authenticated using (true);

create policy "channel_admins_owner_manage" on public.channel_admins
  for all to authenticated
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_admins.channel_id and c.owner_id = auth.uid()
    )
  );

create policy "channel_posts_subscriber_read" on public.channel_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.channel_subscribers cs
      where cs.channel_id = channel_posts.channel_id and cs.user_id = auth.uid()
    )
    or exists (
      select 1 from public.channels c
      where c.id = channel_posts.channel_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.channel_admins ca
      where ca.channel_id = channel_posts.channel_id and ca.user_id = auth.uid()
    )
  );

create policy "channel_posts_admin_insert" on public.channel_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.channels c
        where c.id = channel_posts.channel_id and c.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.channel_admins ca
        where ca.channel_id = channel_posts.channel_id
          and ca.user_id = auth.uid()
          and ca.can_post = true
      )
    )
  );

-- Herkese açık kanal önizlemesi (abone olmadan liste/detay meta)
create policy "channel_posts_public_preview" on public.channel_posts
  for select to anon, authenticated
  using (true);
