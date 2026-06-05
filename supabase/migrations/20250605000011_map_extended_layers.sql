-- Harita genişletme: iş ilanları, personel, iş arayanlar, acil noktalar, içerik takibi

-- İş ilanları ve personel talepleri için konum
alter table public.job_listings
  add column if not exists location geography(point, 4326),
  add column if not exists latitude double precision generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision generated always as (st_x(location::geometry)) stored,
  add column if not exists location_label text,
  add column if not exists district text,
  add column if not exists housing_provided boolean not null default false;

alter table public.staff_requests
  add column if not exists location geography(point, 4326),
  add column if not exists latitude double precision generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision generated always as (st_x(location::geometry)) stored,
  add column if not exists location_label text,
  add column if not exists district text,
  add column if not exists salary_range text;

create index if not exists job_listings_location_idx on public.job_listings using gist (location);
create index if not exists staff_requests_location_idx on public.staff_requests using gist (location);

-- İş arayanlar
create table if not exists public.job_seekers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade unique,
  region_id text not null references public.regions (id),
  title text not null,
  occupation text not null,
  experience_years integer not null default 0,
  skills text[] not null default '{}',
  job_types public.job_type[] not null default '{}',
  description text,
  phone_visible boolean not null default false,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  district text,
  is_visible_on_map boolean not null default true,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_seekers_region_idx on public.job_seekers (region_id, created_at desc);
create index if not exists job_seekers_location_idx on public.job_seekers using gist (location);

create trigger job_seekers_updated_at
  before update on public.job_seekers
  for each row execute function public.set_updated_at();

-- Acil yardım noktaları
create type public.poi_category as enum (
  'hospital',
  'pharmacy',
  'police',
  'fire',
  'veterinary',
  'afad',
  'other'
);

create table if not exists public.emergency_pois (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id),
  name text not null,
  category public.poi_category not null,
  phone text,
  address text,
  description text,
  is_24h boolean not null default false,
  location geography(point, 4326) not null,
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  source text not null default 'seed',
  created_at timestamptz not null default now()
);

create index if not exists emergency_pois_region_idx on public.emergency_pois (region_id);
create index if not exists emergency_pois_location_idx on public.emergency_pois using gist (location);

-- Etkinlik ve olay takibi
create table if not exists public.event_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  notify_on_update boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists public.incident_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  incident_id uuid not null references public.incident_reports (id) on delete cascade,
  notify_on_update boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, incident_id)
);

-- Olay güncellemelerinde takipçilere bildirim kuyruğu
create or replace function public.notify_incident_followers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  select
    f.user_id,
    'incident_update'::public.notification_event_type,
    'Takip ettiğiniz olay güncellendi',
    left(new.content, 180),
    jsonb_build_object('incident_id', new.incident_id, 'update_id', new.id)
  from public.incident_follows f
  where f.incident_id = new.incident_id
    and f.notify_on_update = true;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    f.user_id,
    'incident_update'::public.notification_event_type,
    'Takip ettiğiniz olay güncellendi',
    left(new.content, 180),
    jsonb_build_object('incident_id', new.incident_id, 'update_id', new.id),
    new.author_id
  from public.incident_follows f
  where f.incident_id = new.incident_id
    and f.notify_on_update = true;

  return new;
end;
$$;

drop trigger if exists incident_update_notify_followers on public.incident_updates;
create trigger incident_update_notify_followers
  after insert on public.incident_updates
  for each row execute function public.notify_incident_followers();

-- Trabzon acil noktaları (örnek seed)
insert into public.emergency_pois (region_id, name, category, phone, address, is_24h, location)
values
  (
    'trabzon',
    'Kanuni Eğitim ve Araştırma Hastanesi',
    'hospital',
    '0462 377 0000',
    'Ortahisar, Trabzon',
    true,
    st_setsrid(st_makepoint(39.7178, 41.0089), 4326)::geography
  ),
  (
    'trabzon',
    'Farabi Eğitim ve Araştırma Hastanesi',
    'hospital',
    '0462 377 7000',
    'Yomra, Trabzon',
    true,
    st_setsrid(st_makepoint(39.763, 41.0025), 4326)::geography
  ),
  (
    'trabzon',
    'Trabzon Emniyet Müdürlüğü',
    'police',
    '155',
    'Ortahisar, Trabzon',
    true,
    st_setsrid(st_makepoint(39.73, 41.005), 4326)::geography
  ),
  (
    'trabzon',
    'Trabzon Büyükşehir İtfaiyesi',
    'fire',
    '110',
    'Ortahisar, Trabzon',
    true,
    st_setsrid(st_makepoint(39.715, 41.012), 4326)::geography
  ),
  (
    'trabzon',
    'Merkez Eczanesi',
    'pharmacy',
    '0462 326 0000',
    'Meydan, Trabzon',
    false,
    st_setsrid(st_makepoint(39.7195, 41.002), 4326)::geography
  ),
  (
    'trabzon',
    'Trabzon Veteriner Kliniği',
    'veterinary',
    '0462 330 0000',
    'Kaşüstü, Trabzon',
    false,
    st_setsrid(st_makepoint(39.728, 40.998), 4326)::geography
  )
on conflict do nothing;

-- RLS: iş ilanları ve personel
create policy "job_listings_public_read" on public.job_listings
  for select using (status = 'published');

create policy "job_listings_author_insert" on public.job_listings
  for insert with check (auth.uid() = author_id);

create policy "job_listings_author_update" on public.job_listings
  for update using (auth.uid() = author_id);

create policy "staff_requests_public_read" on public.staff_requests
  for select using (status = 'published');

create policy "staff_requests_author_insert" on public.staff_requests
  for insert with check (auth.uid() = author_id);

create policy "staff_requests_author_update" on public.staff_requests
  for update using (auth.uid() = author_id);

-- RLS: iş arayanlar
alter table public.job_seekers enable row level security;

create policy "job_seekers_public_read" on public.job_seekers
  for select using (status = 'published' and is_visible_on_map = true);

create policy "job_seekers_self_all" on public.job_seekers
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS: acil noktalar
alter table public.emergency_pois enable row level security;

create policy "emergency_pois_public_read" on public.emergency_pois
  for select using (true);

-- RLS: içerik takibi
alter table public.event_follows enable row level security;
alter table public.incident_follows enable row level security;

create policy "event_follows_self_all" on public.event_follows
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "incident_follows_self_all" on public.incident_follows
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
