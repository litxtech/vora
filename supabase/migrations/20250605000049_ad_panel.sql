-- Bölüm 27 — Reklam Paneli (işletme self-serve reklamlar)

create type public.ad_type as enum ('feed', 'reels', 'map', 'business');
create type public.ad_status as enum ('draft', 'pending', 'active', 'paused', 'ended');

create table public.business_ads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  image_url text,
  ad_type public.ad_type not null default 'feed',
  status public.ad_status not null default 'pending',
  budget_cents integer not null default 0,
  spent_cents integer not null default 0,
  target_region_id text references public.regions (id),
  target_district text,
  target_age_min smallint,
  target_age_max smallint,
  target_interests text[] not null default '{}',
  impressions integer not null default 0,
  clicks integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_ads_business_idx on public.business_ads (business_id, created_at desc);
create index business_ads_active_idx on public.business_ads (status, ad_type) where status = 'active';

create trigger business_ads_updated_at
  before update on public.business_ads
  for each row execute function public.set_updated_at();

alter table public.business_ads enable row level security;

create policy "business_ads_owner_all" on public.business_ads
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "business_ads_active_public_read" on public.business_ads
  for select to authenticated
  using (status = 'active');

-- Gelir kaydı (admin paneli ile uyumlu)
create or replace function public.on_business_ad_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.budget_cents > 0 then
    insert into public.revenue_records (revenue_type, amount, reference_id, reference_label, region_id, notes)
    values (
      'advertisement',
      (new.budget_cents::numeric / 100),
      new.id,
      new.title,
      new.target_region_id,
      'İşletme reklamı'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists business_ad_revenue on public.business_ads;
create trigger business_ad_revenue
  after insert on public.business_ads
  for each row execute function public.on_business_ad_created();
