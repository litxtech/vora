-- BÖLÜM 41–56 — Doğrulama, Trafik, Nöbetçi, Fiyat, Turizm, Kargo, Anket,
-- Şehir Puanı, Yardımlaşma, Gönüllü, Yakınımda, Günlük Özet, Vora TV, İhbar, Fırsatlar

-- ─── BÖLÜM 41: Doğrulama Merkezi ───────────────────────────────────────────

create type public.verification_status as enum ('reviewing', 'verified', 'misinfo');

create type public.verification_vote as enum ('verified', 'reviewing', 'misinfo');

create table public.post_verifications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  status public.verification_status not null default 'reviewing',
  verified_votes integer not null default 0,
  misinfo_votes integer not null default 0,
  reviewing_votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id)
);

create table public.post_verification_votes (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.post_verifications (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  vote public.verification_vote not null,
  weight integer not null default 1,
  created_at timestamptz not null default now(),
  unique (verification_id, voter_id)
);

create index post_verifications_region_status_idx on public.post_verifications (region_id, status, updated_at desc);
create index post_verification_votes_verification_idx on public.post_verification_votes (verification_id);

create or replace function public.can_vote_verification(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and (
        role in ('verified_reporter', 'moderator', 'admin', 'super_admin')
        or trust_score >= 70
      )
  );
$$;

-- ─── BÖLÜM 42: Canlı Trafik Merkezi ─────────────────────────────────────────

create type public.traffic_report_type as enum ('accident', 'roadwork', 'radar', 'congestion');

create table public.traffic_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  report_type public.traffic_report_type not null,
  title text not null,
  description text,
  location geography(point, 4326),
  district text,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  is_active boolean not null default true,
  confirm_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index traffic_reports_region_active_idx on public.traffic_reports (region_id, is_active, created_at desc);
create index traffic_reports_location_idx on public.traffic_reports using gist (location);

-- ─── BÖLÜM 43: Nöbetçi Merkezi ──────────────────────────────────────────────

create type public.duty_listing_type as enum ('pharmacy', 'veterinary', 'hospital', 'fuel');

create table public.on_duty_listings (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  listing_type public.duty_listing_type not null,
  name text not null,
  address text,
  phone text,
  location geography(point, 4326),
  duty_date date not null default current_date,
  open_until text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create index on_duty_listings_region_date_idx on public.on_duty_listings (region_id, duty_date, listing_type);
create index on_duty_listings_location_idx on public.on_duty_listings using gist (location);

-- ─── BÖLÜM 44: Fiyat Takip Merkezi ──────────────────────────────────────────

create type public.price_symbol_key as enum ('hazelnut', 'gold', 'usd', 'eur', 'diesel', 'gasoline');

create table public.price_symbols (
  id uuid primary key default gen_random_uuid(),
  symbol_key public.price_symbol_key not null unique,
  label text not null,
  unit text not null default 'TL',
  sort_order integer not null default 0
);

create table public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol_id uuid not null references public.price_symbols (id) on delete cascade,
  value numeric(12, 4) not null,
  change_pct numeric(6, 2),
  source text,
  recorded_at timestamptz not null default now()
);

create index price_snapshots_symbol_time_idx on public.price_snapshots (symbol_id, recorded_at desc);

insert into public.price_symbols (symbol_key, label, unit, sort_order) values
  ('hazelnut', 'Fındık', 'TL/kg', 1),
  ('gold', 'Altın', 'TL/gr', 2),
  ('usd', 'Dolar', 'TL', 3),
  ('eur', 'Euro', 'TL', 4),
  ('diesel', 'Mazot', 'TL/lt', 5),
  ('gasoline', 'Benzin', 'TL/lt', 6)
on conflict (symbol_key) do nothing;

-- ─── BÖLÜM 45: Turizm Merkezi ───────────────────────────────────────────────

create type public.tourism_category as enum ('place', 'waterfall', 'plateau', 'restaurant', 'hotel');

create table public.tourism_places (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  category public.tourism_category not null,
  name text not null,
  description text,
  address text,
  location geography(point, 4326),
  image_url text,
  rating numeric(3, 1),
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index tourism_places_region_category_idx on public.tourism_places (region_id, category);
create index tourism_places_location_idx on public.tourism_places using gist (location);

-- ─── BÖLÜM 46: Kargo ve Teslimat ────────────────────────────────────────────

create type public.delivery_status as enum ('preparing', 'on_the_way', 'delivered', 'cancelled');

create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  tracking_code text not null unique,
  customer_name text,
  customer_phone text,
  status public.delivery_status not null default 'preparing',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_orders_business_status_idx on public.delivery_orders (business_id, status, created_at desc);
create index delivery_orders_tracking_idx on public.delivery_orders (tracking_code);

-- ─── BÖLÜM 47: Anket Merkezi ────────────────────────────────────────────────

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  question text not null,
  is_active boolean not null default true,
  ends_at timestamptz,
  total_votes integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  vote_count integer not null default 0,
  sort_order integer not null default 0
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index polls_region_active_idx on public.polls (region_id, is_active, created_at desc);

-- ─── BÖLÜM 48: Şehir Puanı ──────────────────────────────────────────────────

create table public.city_scores (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade unique,
  traffic_score numeric(3, 1) not null default 7.0,
  cleanliness_score numeric(3, 1) not null default 7.0,
  security_score numeric(3, 1) not null default 7.0,
  quality_score numeric(3, 1) not null default 7.0,
  vote_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.city_score_votes (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  traffic_score numeric(3, 1) not null check (traffic_score between 1 and 10),
  cleanliness_score numeric(3, 1) not null check (cleanliness_score between 1 and 10),
  security_score numeric(3, 1) not null check (security_score between 1 and 10),
  quality_score numeric(3, 1) not null check (quality_score between 1 and 10),
  created_at timestamptz not null default now(),
  unique (region_id, voter_id)
);

-- ─── BÖLÜM 49: Yardımlaşma Merkezi ──────────────────────────────────────────

create type public.help_request_category as enum ('blood', 'medicine', 'student', 'search', 'other');

create type public.help_urgency as enum ('low', 'medium', 'high', 'critical');

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  category public.help_request_category not null,
  urgency public.help_urgency not null default 'medium',
  title text not null,
  description text not null,
  contact_info text,
  location geography(point, 4326),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index help_requests_region_category_idx on public.help_requests (region_id, category, is_resolved, created_at desc);

-- ─── BÖLÜM 50: Gönüllü Ekipler ──────────────────────────────────────────────

create type public.volunteer_team_category as enum ('search_rescue', 'veterinary', 'blood_donation', 'relief');

create table public.volunteer_teams (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  category public.volunteer_team_category not null,
  name text not null,
  description text,
  leader_id uuid references public.profiles (id) on delete set null,
  member_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.volunteer_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.volunteer_teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index volunteer_teams_region_category_idx on public.volunteer_teams (region_id, category, is_active);

-- ─── BÖLÜM 52: Günlük Şehir Özeti ───────────────────────────────────────────

create table public.daily_city_summaries (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  summary_date date not null default current_date,
  summary_text text not null,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (region_id, summary_date)
);

-- ─── BÖLÜM 53: Vora TV ───────────────────────────────────────────────────────

create type public.tv_video_category as enum ('news', 'interview', 'documentary', 'municipality');

create table public.tv_videos (
  id uuid primary key default gen_random_uuid(),
  region_id text references public.regions (id) on delete set null,
  category public.tv_video_category not null,
  title text not null,
  description text,
  thumbnail_url text,
  mux_playback_id text,
  duration_seconds integer,
  is_featured boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index tv_videos_category_idx on public.tv_videos (category, created_at desc);

-- ─── BÖLÜM 54: İhbar Hattı ──────────────────────────────────────────────────

create type public.tip_category as enum ('pollution', 'illegal_building', 'road_issue', 'other');

create type public.tip_moderation_status as enum ('pending', 'approved', 'rejected');

create table public.anonymous_tips (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  category public.tip_category not null,
  description text not null,
  location geography(point, 4326),
  moderation_status public.tip_moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index anonymous_tips_region_status_idx on public.anonymous_tips (region_id, moderation_status, created_at desc);

-- ─── BÖLÜM 55: Yerel Fırsatlar ──────────────────────────────────────────────

create type public.deal_type as enum ('discount', 'campaign', 'coupon');

create table public.local_deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  deal_type public.deal_type not null,
  title text not null,
  description text not null,
  discount_text text,
  coupon_code text,
  image_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index local_deals_region_active_idx on public.local_deals (region_id, is_active, created_at desc);

-- ─── BÖLÜM 51: Yakınımda Ne Var (RPC) ───────────────────────────────────────

create or replace function public.get_nearby_summary(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 15
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_point geography;
  v_result jsonb;
begin
  v_point := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;

  select jsonb_build_object(
    'events', (select count(*) from public.events e where e.location is not null and st_dwithin(e.location, v_point, p_radius_km * 1000) and e.status = 'published'),
    'jobs', (select count(*) from public.job_listings j where j.location is not null and st_dwithin(j.location, v_point, p_radius_km * 1000) and j.status = 'published'),
    'businesses', (select count(*) from public.businesses b where b.location is not null and st_dwithin(b.location, v_point, p_radius_km * 1000)),
    'traffic', (select count(*) from public.traffic_reports t where t.location is not null and st_dwithin(t.location, v_point, p_radius_km * 1000) and t.is_active),
    'incidents', (select count(*) from public.incident_reports i where i.location is not null and st_dwithin(i.location, v_point, p_radius_km * 1000) and i.status = 'active'),
    'help_requests', (select count(*) from public.help_requests h where h.location is not null and st_dwithin(h.location, v_point, p_radius_km * 1000) and not h.is_resolved)
  ) into v_result;

  return v_result;
end;
$$;

-- ─── RLS Policies ───────────────────────────────────────────────────────────

alter table public.post_verifications enable row level security;
alter table public.post_verification_votes enable row level security;
alter table public.traffic_reports enable row level security;
alter table public.on_duty_listings enable row level security;
alter table public.price_symbols enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.tourism_places enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.city_scores enable row level security;
alter table public.city_score_votes enable row level security;
alter table public.help_requests enable row level security;
alter table public.volunteer_teams enable row level security;
alter table public.volunteer_team_members enable row level security;
alter table public.daily_city_summaries enable row level security;
alter table public.tv_videos enable row level security;
alter table public.anonymous_tips enable row level security;
alter table public.local_deals enable row level security;

-- Public read policies
create policy post_verifications_read on public.post_verifications for select using (true);
create policy traffic_reports_read on public.traffic_reports for select using (true);
create policy on_duty_listings_read on public.on_duty_listings for select using (true);
create policy price_symbols_read on public.price_symbols for select using (true);
create policy price_snapshots_read on public.price_snapshots for select using (true);
create policy tourism_places_read on public.tourism_places for select using (true);
create policy polls_read on public.polls for select using (true);
create policy poll_options_read on public.poll_options for select using (true);
create policy city_scores_read on public.city_scores for select using (true);
create policy help_requests_read on public.help_requests for select using (true);
create policy volunteer_teams_read on public.volunteer_teams for select using (true);
create policy daily_city_summaries_read on public.daily_city_summaries for select using (true);
create policy tv_videos_read on public.tv_videos for select using (true);
create policy local_deals_read on public.local_deals for select using (true);

-- Authenticated write policies
create policy traffic_reports_insert on public.traffic_reports for insert with check (auth.uid() = author_id);
create policy help_requests_insert on public.help_requests for insert with check (auth.uid() = author_id);
create policy polls_insert on public.polls for insert with check (auth.uid() = author_id);
create policy poll_votes_insert on public.poll_votes for insert with check (auth.uid() = voter_id);
create policy city_score_votes_insert on public.city_score_votes for insert with check (auth.uid() = voter_id);
create policy post_verification_votes_insert on public.post_verification_votes for insert
  with check (auth.uid() = voter_id and public.can_vote_verification(auth.uid()));
create policy anonymous_tips_insert on public.anonymous_tips for insert with check (true);
create policy volunteer_team_members_insert on public.volunteer_team_members for insert with check (auth.uid() = user_id);
