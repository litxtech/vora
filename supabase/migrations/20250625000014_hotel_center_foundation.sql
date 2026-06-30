-- Otel Merkezi — ilanlar, yorumlar, favoriler, canlı istatistikler

create type public.hotel_listing_status as enum ('draft', 'published', 'paused');

create type public.hotel_guest_type as enum ('student', 'guest', 'other');

create table public.hotel_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  district text,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  price_per_night integer not null check (price_per_night >= 0),
  student_discount_pct smallint not null default 0 check (student_discount_pct between 0 and 70),
  student_discount_note text,
  cover_url text,
  media_urls text[] not null default '{}',
  amenities text[] not null default '{}',
  phone text,
  whatsapp text,
  location geography(point, 4326),
  latitude double precision generated always as (
    case when location is not null then st_y(location::geometry) else null end
  ) stored,
  longitude double precision generated always as (
    case when location is not null then st_x(location::geometry) else null end
  ) stored,
  status public.hotel_listing_status not null default 'draft',
  avg_rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  view_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hotel_listings_feed_idx
  on public.hotel_listings (status, region_id, created_at desc)
  where status = 'published';

create index hotel_listings_owner_idx
  on public.hotel_listings (owner_id, status, created_at desc);

create index hotel_listings_rating_idx
  on public.hotel_listings (status, avg_rating desc, review_count desc)
  where status = 'published';

create index hotel_listings_discount_idx
  on public.hotel_listings (status, student_discount_pct desc, created_at desc)
  where status = 'published' and student_discount_pct > 0;

create index hotel_listings_location_idx
  on public.hotel_listings using gist (location)
  where location is not null;

create table public.hotel_reviews (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotel_listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  guest_type public.hotel_guest_type not null default 'guest',
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(trim(comment)) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, reviewer_id)
);

create index hotel_reviews_hotel_idx
  on public.hotel_reviews (hotel_id, created_at desc);

create index hotel_reviews_reviewer_idx
  on public.hotel_reviews (reviewer_id, created_at desc);

create table public.hotel_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hotel_id uuid not null references public.hotel_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hotel_id)
);

create index hotel_favorites_hotel_idx on public.hotel_favorites (hotel_id);

-- Kapak URL senkronu
create or replace function public.sync_hotel_cover_url()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cover_url := case
    when coalesce(array_length(new.media_urls, 1), 0) > 0 then new.media_urls[1]
    else null
  end;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hotel_listings_cover_sync on public.hotel_listings;
create trigger hotel_listings_cover_sync
  before insert or update of media_urls on public.hotel_listings
  for each row execute function public.sync_hotel_cover_url();

-- Puan ortalaması güncelleme
create or replace function public.refresh_hotel_rating(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(2, 1);
  v_count int;
begin
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)::int
  into v_avg, v_count
  from public.hotel_reviews
  where hotel_id = p_hotel_id;

  update public.hotel_listings
  set avg_rating = v_avg, review_count = v_count, updated_at = now()
  where id = p_hotel_id;
end;
$$;

create or replace function public.on_hotel_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_hotel_rating(old.hotel_id);
    return old;
  end if;
  perform public.refresh_hotel_rating(new.hotel_id);
  return new;
end;
$$;

drop trigger if exists hotel_reviews_rating_sync on public.hotel_reviews;
create trigger hotel_reviews_rating_sync
  after insert or update or delete on public.hotel_reviews
  for each row execute function public.on_hotel_review_change();

-- Görüntülenme sayacı
create or replace function public.increment_hotel_view_count(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hotel_listings
  set view_count = view_count + 1
  where id = p_hotel_id and status = 'published';
end;
$$;

-- Konum güncelleme
create or replace function public.set_hotel_listing_location(
  p_hotel_id uuid,
  p_lng double precision,
  p_lat double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hotel_listings
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      updated_at = now()
  where id = p_hotel_id and owner_id = auth.uid();
end;
$$;

-- Canlı istatistikler
create or replace function public.fetch_hotel_center_stats(p_region_id text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '24 hours';
begin
  return jsonb_build_object(
    'active_hotels', (
      select count(*)::int from public.hotel_listings h
      where h.status = 'published'
        and (p_region_id is null or h.region_id = p_region_id)
    ),
    'active_discounts', (
      select count(*)::int from public.hotel_listings h
      where h.status = 'published'
        and h.student_discount_pct > 0
        and (p_region_id is null or h.region_id = p_region_id)
    ),
    'reviews_24h', (
      select count(*)::int
      from public.hotel_reviews r
      join public.hotel_listings h on h.id = r.hotel_id
      where r.created_at >= v_since
        and h.status = 'published'
        and (p_region_id is null or h.region_id = p_region_id)
    )
  );
end;
$$;

-- RLS
alter table public.hotel_listings enable row level security;
alter table public.hotel_reviews enable row level security;
alter table public.hotel_favorites enable row level security;

create policy hotel_listings_read on public.hotel_listings
  for select using (status = 'published' or owner_id = auth.uid());

create policy hotel_listings_insert on public.hotel_listings
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy hotel_listings_update on public.hotel_listings
  for update to authenticated
  using (owner_id = auth.uid());

create policy hotel_listings_delete on public.hotel_listings
  for delete to authenticated
  using (owner_id = auth.uid());

create policy hotel_reviews_read on public.hotel_reviews
  for select using (true);

create policy hotel_reviews_insert on public.hotel_reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and not exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy hotel_reviews_update on public.hotel_reviews
  for update to authenticated
  using (reviewer_id = auth.uid());

create policy hotel_reviews_delete on public.hotel_reviews
  for delete to authenticated
  using (reviewer_id = auth.uid());

create policy hotel_favorites_read on public.hotel_favorites
  for select using (user_id = auth.uid());

create policy hotel_favorites_insert on public.hotel_favorites
  for insert to authenticated
  with check (user_id = auth.uid());

create policy hotel_favorites_delete on public.hotel_favorites
  for delete to authenticated
  using (user_id = auth.uid());

grant execute on function public.increment_hotel_view_count to authenticated, anon;
grant execute on function public.set_hotel_listing_location to authenticated;
grant execute on function public.fetch_hotel_center_stats to authenticated, anon;

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotel-listings',
  'hotel-listings',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists "hotel_listings_storage_read" on storage.objects;
create policy "hotel_listings_storage_read" on storage.objects
  for select using (bucket_id = 'hotel-listings');

drop policy if exists "hotel_listings_storage_insert" on storage.objects;
create policy "hotel_listings_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hotel-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "hotel_listings_storage_update" on storage.objects;
create policy "hotel_listings_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'hotel-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "hotel_listings_storage_delete" on storage.objects;
create policy "hotel_listings_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hotel-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime
alter publication supabase_realtime add table public.hotel_listings;
alter publication supabase_realtime add table public.hotel_reviews;

-- Feature flag
insert into public.app_feature_flags (feature_id, label, feature_group)
values ('hotel-center', 'Otel Merkezi', 'centers')
on conflict (feature_id) do nothing;
