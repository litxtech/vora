-- Bölüm 8 — Personel Merkezi: başvurular, favoriler, genişletilmiş profiller

-- Çalışma türü genişletme
alter type public.job_type add value if not exists 'daily';
alter type public.job_type add value if not exists 'weekly';

-- Maaş türü
create type public.salary_type as enum ('net', 'range', 'negotiable');

-- Başvuru durumu
create type public.job_application_status as enum (
  'sent',
  'reviewing',
  'interview',
  'accepted',
  'rejected'
);

-- Askerlik durumu
create type public.military_status as enum (
  'completed',
  'exempt',
  'postponed',
  'not_applicable'
);

-- İş ilanı genişletmeleri
alter table public.job_listings
  add column if not exists is_urgent boolean not null default false,
  add column if not exists start_date date,
  add column if not exists meal_provided boolean not null default false,
  add column if not exists experience_required text,
  add column if not exists salary_type public.salary_type not null default 'negotiable',
  add column if not exists view_count integer not null default 0;

-- Personel talebi genişletmeleri
alter table public.staff_requests
  add column if not exists is_urgent boolean not null default false,
  add column if not exists positions_count integer,
  add column if not exists needed_by timestamptz,
  add column if not exists meal_provided boolean not null default false,
  add column if not exists housing_provided boolean not null default false,
  add column if not exists job_type public.job_type not null default 'full_time';

-- İş arayan profili genişletmeleri
alter table public.job_seekers
  add column if not exists education text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists driving_license boolean not null default false,
  add column if not exists military_status public.military_status,
  add column if not exists salary_expectation text,
  add column if not exists is_ready boolean not null default false,
  add column if not exists intro text;

-- Başvurular
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_listings (id) on delete cascade,
  staff_request_id uuid references public.staff_requests (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  status public.job_application_status not null default 'sent',
  message text,
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_application_target_check check (
    (job_id is not null and staff_request_id is null)
    or (job_id is null and staff_request_id is not null)
  )
);

create index job_applications_applicant_idx on public.job_applications (applicant_id, created_at desc);
create index job_applications_employer_idx on public.job_applications (employer_id, created_at desc);
create index job_applications_job_idx on public.job_applications (job_id) where job_id is not null;
create index job_applications_staff_idx on public.job_applications (staff_request_id) where staff_request_id is not null;

create unique index job_applications_unique_job
  on public.job_applications (applicant_id, job_id) where job_id is not null;

create unique index job_applications_unique_staff
  on public.job_applications (applicant_id, staff_request_id) where staff_request_id is not null;

create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

-- Favori ilanlar
create table public.job_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_type text not null check (listing_type in ('job', 'staff')),
  listing_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_type, listing_id)
);

create index job_favorites_user_idx on public.job_favorites (user_id, created_at desc);

-- İşletme takibi
create table public.business_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  notify_on_new_listing boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

-- Referanslar
create table public.job_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  position text not null,
  contact_name text,
  contact_phone text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index job_references_user_idx on public.job_references (user_id);

-- Değerlendirmeler (çift yönlü)
create table public.job_ratings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_id uuid not null references public.profiles (id) on delete cascade,
  rating_type text not null check (rating_type in ('employer_to_candidate', 'candidate_to_employer')),
  punctuality smallint check (punctuality between 1 and 5),
  communication smallint check (communication between 1 and 5),
  discipline smallint check (discipline between 1 and 5),
  quality smallint check (quality between 1 and 5),
  overall smallint not null check (overall between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (application_id, rater_id, rating_type)
);

-- İlan konum güncelleme
create or replace function public.set_job_listing_location(listing_id uuid, lng double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_listings
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography
  where id = listing_id and author_id = auth.uid();
end;
$$;

create or replace function public.set_staff_request_location(request_id uuid, lng double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_requests
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography
  where id = request_id and author_id = auth.uid();
end;
$$;

-- İlan görüntülenme sayacı
create or replace function public.increment_job_view_count(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_listings
  set view_count = view_count + 1
  where id = listing_id and status = 'published';
end;
$$;

-- Acil personel bildirimi
create or replace function public.notify_urgent_staff_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_urgent = true and new.status = 'published' then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    select
      p.id,
      'job'::public.notification_event_type,
      'Acil personel ilanı',
      left(new.title, 120),
      jsonb_build_object('staff_request_id', new.id, 'urgent', true)
    from public.profiles p
    where p.region_id = new.region_id
      and p.id <> new.author_id
      and coalesce((p.notification_prefs->>'jobs')::boolean, true) = true;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    select
      p.id,
      'job'::public.notification_event_type,
      'Acil personel ilanı',
      left(new.title, 120),
      jsonb_build_object('staff_request_id', new.id, 'urgent', true),
      new.author_id
    from public.profiles p
    where p.region_id = new.region_id
      and p.id <> new.author_id
      and coalesce((p.notification_prefs->>'jobs')::boolean, true) = true;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_request_urgent_notify on public.staff_requests;
create trigger staff_request_urgent_notify
  after insert on public.staff_requests
  for each row execute function public.notify_urgent_staff_request();

-- Yeni iş ilanı bildirimi (takipçiler + bölge)
create or replace function public.notify_new_job_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and new.business_id is not null then
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    select
      bf.user_id,
      'job'::public.notification_event_type,
      'Takip ettiğiniz işletmeden yeni ilan',
      left(new.title, 120),
      jsonb_build_object('job_id', new.id),
      new.author_id
    from public.business_follows bf
    where bf.business_id = new.business_id
      and bf.notify_on_new_listing = true
      and bf.user_id <> new.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists job_listing_new_notify on public.job_listings;
create trigger job_listing_new_notify
  after insert on public.job_listings
  for each row execute function public.notify_new_job_listing();

-- RLS
alter table public.job_applications enable row level security;
alter table public.job_favorites enable row level security;
alter table public.business_follows enable row level security;
alter table public.job_references enable row level security;
alter table public.job_ratings enable row level security;

create policy "job_applications_participant_read" on public.job_applications
  for select using (auth.uid() = applicant_id or auth.uid() = employer_id);

create policy "job_applications_applicant_insert" on public.job_applications
  for insert with check (auth.uid() = applicant_id);

create policy "job_applications_employer_update" on public.job_applications
  for update using (auth.uid() = employer_id);

create policy "job_favorites_self_all" on public.job_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "business_follows_self_all" on public.business_follows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "job_references_self_all" on public.job_references
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "job_references_public_read" on public.job_references
  for select using (true);

create policy "job_ratings_participant_read" on public.job_ratings
  for select using (auth.uid() = rater_id or auth.uid() = rated_id);

create policy "job_ratings_rater_insert" on public.job_ratings
  for insert with check (auth.uid() = rater_id);

-- İş arayanlar: hazır olanları herkese göster
drop policy if exists "job_seekers_public_read" on public.job_seekers;
create policy "job_seekers_public_read" on public.job_seekers
  for select using (status = 'published' and is_visible_on_map = true);
