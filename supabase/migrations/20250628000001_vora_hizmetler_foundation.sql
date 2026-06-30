-- Vora Hizmetler — talep, teklif, usta profili, değerlendirme, acil çağır

create type public.vora_service_category as enum (
  'elektrik', 'su_tesisati', 'boya', 'alci', 'insaat', 'klima', 'kombi',
  'mobilya', 'marangoz', 'oto_tamir', 'cekici', 'lastik', 'bilgisayar',
  'yazilim', 'web_tasarim', 'fotografci', 'kameraman', 'dugun_organizasyon',
  'kuafor', 'guzellik', 'temizlik', 'nakliye', 'veteriner', 'bahcivan',
  'ozel_ders', 'avukat', 'muhasebeci', 'diger'
);

create type public.vora_service_urgency as enum ('now', 'today', 'tomorrow', 'this_week');

create type public.vora_service_request_status as enum (
  'pending_offers', 'offer_accepted', 'en_route', 'in_progress',
  'completed', 'rated', 'cancelled'
);

create type public.vora_service_offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create type public.vora_service_badge as enum (
  'verified', 'top_choice', 'emergency', 'premium', 'best_service', 'fast_response'
);

create type public.vora_service_account_type as enum ('individual', 'business');

-- Hizmet veren profili (dijital kartvizit)
create table public.vora_service_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  profession text not null,
  bio text,
  city text,
  region_id text references public.regions (id),
  avatar_url text,
  cover_url text,
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  workplace_verified boolean not null default false,
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0,
  completed_jobs integer not null default 0,
  completion_rate numeric(5,2) not null default 100 check (completion_rate between 0 and 100),
  response_minutes integer,
  membership_years integer not null default 0,
  account_type public.vora_service_account_type not null default 'individual',
  categories public.vora_service_category[] not null default '{}',
  badges public.vora_service_badge[] not null default '{}',
  is_premium boolean not null default false,
  is_active boolean not null default true,
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vora_service_providers_region_idx
  on public.vora_service_providers (region_id, is_active)
  where is_active = true;

create index vora_service_providers_categories_idx
  on public.vora_service_providers using gin (categories)
  where is_active = true;

create index vora_service_providers_location_idx
  on public.vora_service_providers using gist (location)
  where location is not null and is_active = true;

create index vora_service_providers_search_idx
  on public.vora_service_providers using gin (search_vector);

-- Hizmet talepleri
create table public.vora_service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  region_id text references public.regions (id),
  city text,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  category public.vora_service_category not null,
  urgency public.vora_service_urgency not null default 'today',
  status public.vora_service_request_status not null default 'pending_offers',
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  is_emergency boolean not null default false,
  accepted_offer_id uuid,
  accepted_provider_id uuid references public.vora_service_providers (id),
  offer_count integer not null default 0,
  image_urls text[] not null default '{}',
  location geography(point, 4326),
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vora_service_requests_feed_idx
  on public.vora_service_requests (status, created_at desc)
  where status in ('pending_offers', 'offer_accepted', 'en_route', 'in_progress');

create index vora_service_requests_requester_idx
  on public.vora_service_requests (requester_id, status, created_at desc);

create index vora_service_requests_category_idx
  on public.vora_service_requests (category, status, created_at desc)
  where status = 'pending_offers';

create index vora_service_requests_region_idx
  on public.vora_service_requests (region_id, category, status, created_at desc);

create index vora_service_requests_location_idx
  on public.vora_service_requests using gist (location)
  where location is not null;

create index vora_service_requests_search_idx
  on public.vora_service_requests using gin (search_vector);

-- Teklifler
create table public.vora_service_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.vora_service_requests (id) on delete cascade,
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  price numeric(12,2) not null check (price > 0),
  estimated_arrival timestamptz,
  message text,
  warranty_months integer check (warranty_months is null or warranty_months >= 0),
  status public.vora_service_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index vora_service_offers_request_idx
  on public.vora_service_offers (request_id, status, created_at desc);

create index vora_service_offers_provider_idx
  on public.vora_service_offers (provider_id, status, created_at desc);

alter table public.vora_service_requests
  add constraint vora_service_requests_accepted_offer_fkey
  foreign key (accepted_offer_id) references public.vora_service_offers (id);

-- Portfolyo
create table public.vora_service_portfolio (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  title text not null,
  description text,
  before_image_url text,
  after_image_url text,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index vora_service_portfolio_provider_idx
  on public.vora_service_portfolio (provider_id, created_at desc);

-- Sertifikalar
create table public.vora_service_certificates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  title text not null,
  document_url text,
  issued_at date,
  created_at timestamptz not null default now()
);

create index vora_service_certificates_provider_idx
  on public.vora_service_certificates (provider_id);

-- Favori ustalar
create table public.vora_service_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

-- Usta takibi (abonelik)
create table public.vora_service_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

-- Değerlendirmeler
create table public.vora_service_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.vora_service_requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  quality smallint not null check (quality between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  cleanliness smallint not null check (cleanliness between 1 and 5),
  value_for_money smallint not null check (value_for_money between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  would_recommend boolean not null default true,
  comment text,
  created_at timestamptz not null default now()
);

create index vora_service_reviews_provider_idx
  on public.vora_service_reviews (provider_id, created_at desc);

-- İş durumu geçmişi
create table public.vora_service_status_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.vora_service_requests (id) on delete cascade,
  status public.vora_service_request_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index vora_service_status_log_request_idx
  on public.vora_service_status_log (request_id, created_at asc);

-- Acil çağır oturumları
create table public.vora_service_emergency_sessions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  category public.vora_service_category not null,
  region_id text references public.regions (id),
  city text,
  latitude double precision,
  longitude double precision,
  matched_provider_id uuid references public.vora_service_providers (id),
  matched_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index vora_service_emergency_active_idx
  on public.vora_service_emergency_sessions (category, region_id, expires_at desc)
  where matched_provider_id is null;

-- Arama vektörleri
create or replace function public.sync_vora_service_request_search_vector()
returns trigger language plpgsql set search_path = public as $$
begin
  new.search_vector :=
    setweight(to_tsvector('turkish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.city, '')), 'C');
  return new;
end;
$$;

create trigger vora_service_requests_search_sync
  before insert or update of title, description, city on public.vora_service_requests
  for each row execute function public.sync_vora_service_request_search_vector();

create or replace function public.sync_vora_service_provider_search_vector()
returns trigger language plpgsql set search_path = public as $$
begin
  new.search_vector :=
    setweight(to_tsvector('turkish', coalesce(new.display_name, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(new.profession, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.city, '')), 'C');
  return new;
end;
$$;

create trigger vora_service_providers_search_sync
  before insert or update of display_name, profession, city on public.vora_service_providers
  for each row execute function public.sync_vora_service_provider_search_vector();

-- updated_at
create trigger vora_service_providers_updated_at
  before update on public.vora_service_providers
  for each row execute function public.set_updated_at();

create trigger vora_service_requests_updated_at
  before update on public.vora_service_requests
  for each row execute function public.set_updated_at();

create trigger vora_service_offers_updated_at
  before update on public.vora_service_offers
  for each row execute function public.set_updated_at();

-- Teklif sayacı
create or replace function public.sync_vora_service_offer_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.vora_service_requests set offer_count = offer_count + 1 where id = new.request_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.vora_service_requests set offer_count = greatest(offer_count - 1, 0) where id = old.request_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger vora_service_offer_count_sync
  after insert or delete on public.vora_service_offers
  for each row execute function public.sync_vora_service_offer_count();

-- Durum logu
create or replace function public.log_vora_service_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.vora_service_status_log (request_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger vora_service_status_log_sync
  after insert or update of status on public.vora_service_requests
  for each row execute function public.log_vora_service_status_change();

-- Konum ayarlama
create or replace function public.set_vora_service_request_location(
  p_request_id uuid, lng double precision, lat double precision
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.vora_service_requests
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography, updated_at = now()
  where id = p_request_id and requester_id = auth.uid();
end;
$$;

create or replace function public.set_vora_service_provider_location(
  p_provider_id uuid, lng double precision, lat double precision
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.vora_service_providers
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography, updated_at = now()
  where id = p_provider_id and user_id = auth.uid();
end;
$$;

-- RLS
alter table public.vora_service_providers enable row level security;
alter table public.vora_service_requests enable row level security;
alter table public.vora_service_offers enable row level security;
alter table public.vora_service_portfolio enable row level security;
alter table public.vora_service_certificates enable row level security;
alter table public.vora_service_favorites enable row level security;
alter table public.vora_service_subscriptions enable row level security;
alter table public.vora_service_reviews enable row level security;
alter table public.vora_service_status_log enable row level security;
alter table public.vora_service_emergency_sessions enable row level security;

-- Providers
create policy vora_service_providers_select on public.vora_service_providers
  for select using (is_active = true or user_id = auth.uid());

create policy vora_service_providers_insert on public.vora_service_providers
  for insert with check (user_id = auth.uid());

create policy vora_service_providers_update on public.vora_service_providers
  for update using (user_id = auth.uid());

-- Requests
create policy vora_service_requests_select on public.vora_service_requests
  for select using (
    requester_id = auth.uid()
    or status = 'pending_offers'
    or accepted_provider_id in (
      select id from public.vora_service_providers where user_id = auth.uid()
    )
  );

create policy vora_service_requests_insert on public.vora_service_requests
  for insert with check (requester_id = auth.uid());

create policy vora_service_requests_update on public.vora_service_requests
  for update using (
    requester_id = auth.uid()
    or accepted_provider_id in (
      select id from public.vora_service_providers where user_id = auth.uid()
    )
  );

-- Offers
create policy vora_service_offers_select on public.vora_service_offers
  for select using (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
    or request_id in (select id from public.vora_service_requests where requester_id = auth.uid())
  );

create policy vora_service_offers_insert on public.vora_service_offers
  for insert with check (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  );

create policy vora_service_offers_update on public.vora_service_offers
  for update using (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
    or request_id in (select id from public.vora_service_requests where requester_id = auth.uid())
  );

-- Portfolio & certificates
create policy vora_service_portfolio_all on public.vora_service_portfolio
  for all using (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  )
  with check (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  );

create policy vora_service_portfolio_public_select on public.vora_service_portfolio
  for select using (true);

create policy vora_service_certificates_all on public.vora_service_certificates
  for all using (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  )
  with check (
    provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  );

create policy vora_service_certificates_public_select on public.vora_service_certificates
  for select using (true);

-- Favorites & subscriptions
create policy vora_service_favorites_all on public.vora_service_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vora_service_subscriptions_all on public.vora_service_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reviews
create policy vora_service_reviews_select on public.vora_service_reviews for select using (true);
create policy vora_service_reviews_insert on public.vora_service_reviews
  for insert with check (reviewer_id = auth.uid());

-- Status log
create policy vora_service_status_log_select on public.vora_service_status_log
  for select using (
    request_id in (
      select id from public.vora_service_requests
      where requester_id = auth.uid()
        or accepted_provider_id in (
          select id from public.vora_service_providers where user_id = auth.uid()
        )
    )
  );

-- Emergency
create policy vora_service_emergency_all on public.vora_service_emergency_sessions
  for all using (requester_id = auth.uid()) with check (requester_id = auth.uid());

create policy vora_service_emergency_provider_select on public.vora_service_emergency_sessions
  for select using (matched_provider_id is null and expires_at > now());

-- Realtime
alter publication supabase_realtime add table public.vora_service_requests;
alter publication supabase_realtime add table public.vora_service_offers;

-- Feature flag
insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('vora-hizmetler', 'Hizmetler', 'tabs', true)
on conflict (feature_id) do update set label = excluded.label, feature_group = excluded.feature_group;

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vora-hizmetler',
  'vora-hizmetler',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

create policy vora_hizmetler_storage_select on storage.objects
  for select using (bucket_id = 'vora-hizmetler');

create policy vora_hizmetler_storage_insert on storage.objects
  for insert with check (bucket_id = 'vora-hizmetler' and auth.uid()::text = (storage.foldername(name))[1]);

create policy vora_hizmetler_storage_delete on storage.objects
  for delete using (bucket_id = 'vora-hizmetler' and auth.uid()::text = (storage.foldername(name))[1]);
