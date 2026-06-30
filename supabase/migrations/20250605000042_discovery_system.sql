-- Bölüm 21 — Keşfet Sistemi: trend skorlama ve keşif sorguları

-- İşletme görüntülenme sayacı (trend sıralaması için)
alter table public.businesses
  add column if not exists view_count integer not null default 0;

create index if not exists businesses_region_created_idx
  on public.businesses (region_id, created_at desc);

create index if not exists posts_trend_idx
  on public.posts (region_id, category, created_at desc)
  where status = 'published';

create index if not exists reels_trend_idx
  on public.reels (region_id, created_at desc)
  where status = 'published';

create index if not exists events_trend_idx
  on public.events (region_id, starts_at desc)
  where status = 'published';

create index if not exists job_listings_trend_idx
  on public.job_listings (region_id, created_at desc)
  where status = 'published';

-- Trend skoru hesaplama
create or replace function public.discovery_trend_score(
  p_likes integer,
  p_comments integer,
  p_quotes integer,
  p_saves integer,
  p_shares integer,
  p_views integer,
  p_completion_rate numeric default 0,
  p_going_count integer default 0,
  p_follower_count integer default 0,
  p_is_urgent boolean default false,
  p_is_verified boolean default false,
  p_created_at timestamptz default now(),
  p_period_hours integer default 168
)
returns numeric
language sql
immutable
as $$
  select
    coalesce(p_likes, 0) * 3
    + coalesce(p_comments, 0) * 5
    + coalesce(p_quotes, 0) * 4
    + coalesce(p_saves, 0) * 6
    + coalesce(p_shares, 0) * 8
    + coalesce(p_views, 0) * 0.1
    + coalesce(p_completion_rate, 0) * 50
    + coalesce(p_going_count, 0) * 10
    + coalesce(p_follower_count, 0) * 2
    + case when p_is_urgent then 20 else 0 end
    + case when p_is_verified then 15 else 0 end
    + greatest(
        0,
        1 - extract(epoch from (now() - p_created_at)) / 3600 / greatest(p_period_hours, 1)
      ) * 50;
$$;

-- İşletme görüntülenme artırma
create or replace function public.increment_business_view_count(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses
  set view_count = view_count + 1
  where id = p_business_id;
end;
$$;

grant execute on function public.discovery_trend_score(
  integer, integer, integer, integer, integer, integer,
  numeric, integer, integer, boolean, boolean, timestamptz, integer
) to anon, authenticated;

grant execute on function public.increment_business_view_count(uuid) to authenticated;
