-- VORA İhtiyaç Paylaşım Ağı — ilanlar, favoriler, raporlar, feed araması

create type public.vora_need_category as enum (
  'product',
  'service',
  'help',
  'job'
);

create type public.vora_need_visibility as enum (
  'global',
  'city',
  'nearby'
);

create type public.vora_need_urgency as enum (
  'normal',
  'urgent'
);

create type public.vora_need_status as enum (
  'active',
  'hidden',
  'removed',
  'reported',
  'reviewing'
);

create table public.vora_needs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text references public.regions (id),
  city text,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  category public.vora_need_category not null,
  visibility public.vora_need_visibility not null default 'city',
  urgency public.vora_need_urgency not null default 'normal',
  status public.vora_need_status not null default 'active',
  content_status public.content_status not null default 'published',
  image_url text,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  is_featured boolean not null default false,
  featured_until timestamptz,
  view_count integer not null default 0,
  favorite_count integer not null default 0,
  report_count integer not null default 0,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vora_needs_visibility_region_check check (
    visibility = 'global' or region_id is not null
  )
);

create index vora_needs_feed_idx
  on public.vora_needs (status, content_status, is_featured desc, created_at desc)
  where status = 'active' and content_status = 'published';

create index vora_needs_region_idx
  on public.vora_needs (region_id, status, visibility, created_at desc)
  where content_status = 'published';

create index vora_needs_author_idx
  on public.vora_needs (author_id, status, created_at desc);

create index vora_needs_category_idx
  on public.vora_needs (category, status, created_at desc)
  where content_status = 'published' and status = 'active';

create index vora_needs_search_idx
  on public.vora_needs using gin (search_vector);

create index vora_needs_location_idx
  on public.vora_needs using gist (location)
  where location is not null;

create table public.vora_need_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  need_id uuid not null references public.vora_needs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, need_id)
);

create index vora_need_favorites_need_idx on public.vora_need_favorites (need_id);

create table public.vora_need_reports (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.vora_needs (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (need_id, reporter_id)
);

create index vora_need_reports_pending_idx
  on public.vora_need_reports (status, created_at desc)
  where status = 'pending';

-- Arama vektörü
create or replace function public.sync_vora_need_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('turkish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.city, '')), 'C');
  return new;
end;
$$;

drop trigger if exists vora_needs_search_vector_sync on public.vora_needs;
create trigger vora_needs_search_vector_sync
  before insert or update of title, description, city on public.vora_needs
  for each row execute function public.sync_vora_need_search_vector();

-- updated_at
drop trigger if exists vora_needs_updated_at on public.vora_needs;
create trigger vora_needs_updated_at
  before update on public.vora_needs
  for each row execute function public.set_updated_at();

-- Konum
create or replace function public.set_vora_need_location(
  p_need_id uuid,
  lng double precision,
  lat double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vora_needs
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      updated_at = now()
  where id = p_need_id and author_id = auth.uid();
end;
$$;

create or replace function public.increment_vora_need_view(p_need_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vora_needs
  set view_count = view_count + 1
  where id = p_need_id
    and content_status = 'published'
    and status = 'active';
end;
$$;

-- Favori sayacı
create or replace function public.sync_vora_need_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.vora_needs set favorite_count = favorite_count + 1 where id = new.need_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.vora_needs set favorite_count = greatest(favorite_count - 1, 0) where id = old.need_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists vora_need_favorite_count_sync on public.vora_need_favorites;
create trigger vora_need_favorite_count_sync
  after insert or delete on public.vora_need_favorites
  for each row execute function public.sync_vora_need_favorite_count();

-- Rapor sayacı
create or replace function public.sync_vora_need_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.vora_needs
    set report_count = report_count + 1,
        status = case when report_count + 1 >= 3 then 'reported'::public.vora_need_status else status end
    where id = new.need_id;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists vora_need_report_count_sync on public.vora_need_reports;
create trigger vora_need_report_count_sync
  after insert on public.vora_need_reports
  for each row execute function public.sync_vora_need_report_count();

-- Feed araması
create or replace function public.search_vora_needs(
  p_viewer_region_id text default null,
  p_category public.vora_need_category default null,
  p_visibility public.vora_need_visibility default null,
  p_urgency public.vora_need_urgency default null,
  p_urgent_only boolean default false,
  p_global_only boolean default false,
  p_city_only boolean default false,
  p_author_id uuid default null,
  p_query text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_limit int default 30,
  p_offset int default 0
)
returns setof public.vora_needs
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
  select n.*
  from public.vora_needs n
  where n.content_status = 'published'
    and n.status = 'active'
    and (p_author_id is null or n.author_id = p_author_id)
    and (p_category is null or n.category = p_category)
    and (p_visibility is null or n.visibility = p_visibility)
    and (p_urgency is null or n.urgency = p_urgency)
    and (not p_urgent_only or n.urgency = 'urgent')
    and (not p_global_only or n.visibility = 'global')
    and (
      p_author_id is not null
      or n.visibility = 'global'
      or (n.visibility = 'city' and p_viewer_region_id is not null and n.region_id = p_viewer_region_id)
      or (
        n.visibility = 'nearby'
        and p_lat is not null
        and p_lng is not null
        and n.location is not null
        and st_dwithin(
          n.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          coalesce(p_radius_km, 10) * 1000
        )
      )
      or (
        p_city_only
        and p_viewer_region_id is not null
        and n.region_id = p_viewer_region_id
        and n.visibility in ('city', 'nearby')
      )
    )
    and (
      v_query is null
      or n.search_vector @@ v_query
      or n.title ilike '%' || trim(p_query) || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_km is null or n.location is null
      or n.visibility = 'global'
      or st_dwithin(
        n.location,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
    )
  order by
    n.is_featured desc nulls last,
    case when n.urgency = 'urgent' then 0 else 1 end,
    n.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

-- Admin RPC'ler
create or replace function public.get_admin_vora_needs(
  p_status text default null,
  p_limit int default 80
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t))
    from (
      select
        n.id, n.title, n.description, n.category, n.visibility, n.urgency,
        n.status, n.region_id, n.city, n.is_featured, n.report_count,
        n.view_count, n.favorite_count, n.created_at, n.image_url,
        p.username as author_username,
        p.full_name as author_name
      from public.vora_needs n
      join public.profiles p on p.id = n.author_id
      where p_status is null or n.status::text = p_status
      order by
        case when n.status = 'reported' then 0 when n.status = 'reviewing' then 1 else 2 end,
        n.created_at desc
      limit greatest(1, least(p_limit, 200))
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_vora_need_status(
  p_need_id uuid,
  p_status public.vora_need_status
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
  update public.vora_needs
  set status = p_status, updated_at = now()
  where id = p_need_id;
end;
$$;

create or replace function public.admin_feature_vora_need(
  p_need_id uuid,
  p_featured boolean default true,
  p_days int default 7
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
  update public.vora_needs
  set
    is_featured = p_featured,
    featured_until = case when p_featured then now() + make_interval(days => greatest(p_days, 1)) else null end,
    updated_at = now()
  where id = p_need_id;
end;
$$;

create or replace function public.admin_get_vora_need_reports(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t))
    from (
      select
        r.id, r.reason, r.details, r.status, r.created_at,
        n.id as need_id, n.title as need_title, n.status as need_status,
        rp.username as reporter_username
      from public.vora_need_reports r
      join public.vora_needs n on n.id = r.need_id
      join public.profiles rp on rp.id = r.reporter_id
      where r.status = 'pending'
      order by r.created_at desc
      limit greatest(1, least(p_limit, 100))
    ) t
  ), '[]'::jsonb);
end;
$$;

-- RLS
alter table public.vora_needs enable row level security;
alter table public.vora_need_favorites enable row level security;
alter table public.vora_need_reports enable row level security;

create policy vora_needs_read on public.vora_needs
  for select using (
    (content_status = 'published' and status = 'active')
    or author_id = auth.uid()
    or public.is_moderator()
  );

create policy vora_needs_insert on public.vora_needs
  for insert with check (author_id = auth.uid());

create policy vora_needs_update on public.vora_needs
  for update using (author_id = auth.uid() or public.is_moderator());

create policy vora_needs_delete on public.vora_needs
  for delete using (author_id = auth.uid() or public.is_moderator());

create policy vora_need_favorites_own on public.vora_need_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vora_need_reports_insert on public.vora_need_reports
  for insert with check (reporter_id = auth.uid());

create policy vora_need_reports_read on public.vora_need_reports
  for select using (reporter_id = auth.uid() or public.is_moderator());

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vora-needs',
  'vora-needs',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "VORA ihtiyaç görselleri herkese açık"
on storage.objects for select using (bucket_id = 'vora-needs');

create policy "Kullanıcı ihtiyaç görseli yükleyebilir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vora-needs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı ihtiyaç görselini güncelleyebilir"
on storage.objects for update to authenticated
using (
  bucket_id = 'vora-needs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant execute on function public.set_vora_need_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.increment_vora_need_view(uuid) to authenticated, anon;
grant execute on function public.search_vora_needs(
  text, public.vora_need_category, public.vora_need_visibility, public.vora_need_urgency,
  boolean, boolean, boolean, uuid, text, double precision, double precision,
  double precision, int, int
) to authenticated, anon;
grant execute on function public.get_admin_vora_needs(text, int) to authenticated;
grant execute on function public.admin_update_vora_need_status(uuid, public.vora_need_status) to authenticated;
grant execute on function public.admin_feature_vora_need(uuid, boolean, int) to authenticated;
grant execute on function public.admin_get_vora_need_reports(int) to authenticated;
