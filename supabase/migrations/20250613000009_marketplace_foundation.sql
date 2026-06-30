-- Yerel Pazar — ilanlar, favoriler, yorumlar, raporlar, arama

create type public.marketplace_category as enum (
  'electronics',
  'home_living',
  'furniture',
  'clothing',
  'baby_kids',
  'sports',
  'entertainment',
  'books_media',
  'vehicles',
  'garden_agri',
  'handmade',
  'pets',
  'office_business',
  'collectibles',
  'services',
  'real_estate',
  'other'
);

create type public.marketplace_listing_type as enum (
  'sale',
  'negotiable',
  'trade',
  'free'
);

create type public.marketplace_condition as enum (
  'new',
  'like_new',
  'used',
  'for_parts'
);

create type public.marketplace_listing_status as enum (
  'active',
  'reserved',
  'sold',
  'removed',
  'archived'
);

create type public.marketplace_delivery_mode as enum (
  'meetup',
  'shipping'
);

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  region_id text not null references public.regions (id),
  district text not null,
  category public.marketplace_category not null,
  subcategory text not null,
  title text not null check (char_length(trim(title)) between 3 and 80),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  price numeric(12, 2),
  currency text not null default 'try',
  listing_type public.marketplace_listing_type not null default 'sale',
  condition public.marketplace_condition not null default 'used',
  status public.marketplace_listing_status not null default 'active',
  content_status public.content_status not null default 'published',
  delivery_mode public.marketplace_delivery_mode not null default 'meetup',
  shipping_note text,
  media_urls text[] not null default '{}',
  cover_url text,
  tags text[] not null default '{}',
  show_phone boolean not null default false,
  contact_phone text,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  view_count integer not null default 0,
  favorite_count integer not null default 0,
  comment_count integer not null default 0,
  search_vector tsvector,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listings_price_check check (
    listing_type = 'free' or price is null or price >= 0
  ),
  constraint marketplace_listings_media_check check (
    cardinality(media_urls) >= 0 and cardinality(media_urls) <= 8
  ),
  constraint marketplace_listings_tags_check check (
    cardinality(tags) <= 3
  )
);

create index marketplace_listings_region_status_idx
  on public.marketplace_listings (region_id, status, content_status, created_at desc);

create index marketplace_listings_category_idx
  on public.marketplace_listings (region_id, category, status, favorite_count desc);

create index marketplace_listings_author_idx
  on public.marketplace_listings (author_id, status, created_at desc);

create index marketplace_listings_favorites_idx
  on public.marketplace_listings (region_id, status, favorite_count desc, view_count desc)
  where content_status = 'published' and status = 'active';

create index marketplace_listings_search_idx
  on public.marketplace_listings using gin (search_vector);

create or replace function public.sync_marketplace_listing_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('turkish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), '')), 'C');
  return new;
end;
$$;

drop trigger if exists marketplace_listings_search_vector_sync on public.marketplace_listings;
create trigger marketplace_listings_search_vector_sync
  before insert or update of title, description, tags on public.marketplace_listings
  for each row execute function public.sync_marketplace_listing_search_vector();

create index marketplace_listings_location_idx
  on public.marketplace_listings using gist (location)
  where location is not null;

create table public.marketplace_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index marketplace_favorites_listing_idx on public.marketplace_favorites (listing_id);

create table public.marketplace_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.marketplace_comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  is_removed boolean not null default false,
  created_at timestamptz not null default now()
);

create index marketplace_comments_listing_idx
  on public.marketplace_comments (listing_id, created_at desc)
  where is_removed = false;

create table public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

-- Konum
create or replace function public.set_marketplace_location(
  p_listing_id uuid,
  lng double precision,
  lat double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_listings
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      updated_at = now()
  where id = p_listing_id and author_id = auth.uid();
end;
$$;

create or replace function public.increment_marketplace_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_listings
  set view_count = view_count + 1
  where id = p_listing_id
    and content_status = 'published'
    and status in ('active', 'reserved');
end;
$$;

create or replace function public.sync_marketplace_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.marketplace_listings
    set favorite_count = favorite_count + 1
    where id = new.listing_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.marketplace_listings
    set favorite_count = greatest(favorite_count - 1, 0)
    where id = old.listing_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists marketplace_favorite_count_sync on public.marketplace_favorites;
create trigger marketplace_favorite_count_sync
  after insert or delete on public.marketplace_favorites
  for each row execute function public.sync_marketplace_favorite_count();

create or replace function public.sync_marketplace_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and not new.is_removed then
    update public.marketplace_listings
    set comment_count = comment_count + 1
    where id = new.listing_id;
  elsif tg_op = 'UPDATE' and old.is_removed = false and new.is_removed = true then
    update public.marketplace_listings
    set comment_count = greatest(comment_count - 1, 0)
    where id = new.listing_id;
  elsif tg_op = 'DELETE' and not old.is_removed then
    update public.marketplace_listings
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.listing_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists marketplace_comment_count_sync on public.marketplace_comments;
create trigger marketplace_comment_count_sync
  after insert or update or delete on public.marketplace_comments
  for each row execute function public.sync_marketplace_comment_count();

create or replace function public.search_marketplace_listings(
  p_region_id text,
  p_query text default null,
  p_category public.marketplace_category default null,
  p_listing_type public.marketplace_listing_type default null,
  p_condition public.marketplace_condition default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_sort text default 'favorites',
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.marketplace_listings
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query tsquery;
begin
  if p_query is not null and char_length(trim(p_query)) >= 2 then
    v_query := plainto_tsquery('turkish', trim(p_query));
  end if;

  return query
  select l.*
  from public.marketplace_listings l
  where l.region_id = p_region_id
    and l.content_status = 'published'
    and l.status = 'active'
    and (p_category is null or l.category = p_category)
    and (p_listing_type is null or l.listing_type = p_listing_type)
    and (p_condition is null or l.condition = p_condition)
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (
      v_query is null
      or l.search_vector @@ v_query
      or l.title ilike '%' || trim(p_query) || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_km is null or l.location is null
      or st_dwithin(
        l.location,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
    )
  order by
    case when p_sort = 'nearest' and l.location is not null and p_lat is not null and p_lng is not null then
      st_distance(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    else null end asc nulls last,
    case when p_sort = 'price_asc' then l.price end asc nulls last,
    case when p_sort = 'price_desc' then l.price end desc nulls last,
    case when p_sort = 'newest' then extract(epoch from l.created_at) end desc,
    l.favorite_count desc,
    l.view_count desc,
    l.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

-- RLS
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_favorites enable row level security;
alter table public.marketplace_comments enable row level security;
alter table public.marketplace_reports enable row level security;

create policy marketplace_listings_read on public.marketplace_listings
  for select using (
    (content_status = 'published' and status in ('active', 'reserved', 'sold'))
    or author_id = auth.uid()
    or public.is_moderator()
  );

create policy marketplace_listings_insert on public.marketplace_listings
  for insert with check (author_id = auth.uid());

create policy marketplace_listings_update on public.marketplace_listings
  for update using (author_id = auth.uid() or public.is_moderator());

create policy marketplace_listings_delete on public.marketplace_listings
  for delete using (author_id = auth.uid() or public.is_moderator());

create policy marketplace_favorites_own on public.marketplace_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy marketplace_comments_read on public.marketplace_comments
  for select using (true);

create policy marketplace_comments_insert on public.marketplace_comments
  for insert with check (author_id = auth.uid());

create policy marketplace_comments_update on public.marketplace_comments
  for update using (author_id = auth.uid() or public.is_moderator());

create policy marketplace_reports_insert on public.marketplace_reports
  for insert with check (reporter_id = auth.uid());

create policy marketplace_reports_staff on public.marketplace_reports
  for select using (reporter_id = auth.uid() or public.is_moderator());

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-listings',
  'marketplace-listings',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy marketplace_listings_storage_read on storage.objects
  for select using (bucket_id = 'marketplace-listings');

create policy marketplace_listings_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'marketplace-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy marketplace_listings_storage_delete on storage.objects
  for delete using (
    bucket_id = 'marketplace-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Feature flag
insert into public.app_feature_flags (feature_id, label, feature_group)
values ('marketplace', 'Yerel Pazar', 'centers')
on conflict (feature_id) do nothing;

-- Admin listing helpers
create or replace function public.admin_list_marketplace_listings(p_limit int default 50)
returns table (
  id uuid,
  title text,
  author_id uuid,
  region_id text,
  category public.marketplace_category,
  status public.marketplace_listing_status,
  content_status public.content_status,
  price numeric,
  favorite_count int,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.title, l.author_id, l.region_id, l.category,
    l.status, l.content_status, l.price, l.favorite_count, l.created_at
  from public.marketplace_listings l
  where public.is_moderator()
  order by l.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.admin_set_marketplace_listing_content_status(
  p_listing_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;
  update public.marketplace_listings
  set content_status = p_status, updated_at = now()
  where id = p_listing_id;
end;
$$;

grant execute on function public.set_marketplace_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.increment_marketplace_view(uuid) to authenticated;
grant execute on function public.search_marketplace_listings(
  text, text, public.marketplace_category, public.marketplace_listing_type,
  public.marketplace_condition, numeric, numeric, double precision, double precision,
  double precision, text, int, int
) to authenticated, anon;
grant execute on function public.admin_list_marketplace_listings(int) to authenticated;
grant execute on function public.admin_set_marketplace_listing_content_status(uuid, public.content_status) to authenticated;
