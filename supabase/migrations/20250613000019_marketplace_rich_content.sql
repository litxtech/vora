-- Zengin açıklama, yorum medyası, fiyat geçmişi

alter table public.marketplace_listings
  add column if not exists description_blocks jsonb not null default '[]'::jsonb;

alter table public.marketplace_comments
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists comment_kind text not null default 'general'
    check (comment_kind in ('general', 'buyer_proof'));

alter table public.marketplace_comments
  drop constraint if exists marketplace_comments_body_check;

alter table public.marketplace_comments
  add constraint marketplace_comments_body_check
  check (char_length(trim(body)) between 1 and 2000);

create table if not exists public.marketplace_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  price numeric(12, 2),
  listing_type public.marketplace_listing_type not null,
  recorded_at timestamptz not null default now()
);

create index if not exists marketplace_price_snapshots_listing_idx
  on public.marketplace_price_snapshots (listing_id, recorded_at desc);

alter table public.marketplace_price_snapshots enable row level security;

create policy marketplace_price_snapshots_read on public.marketplace_price_snapshots
  for select using (true);

create or replace function public.sync_marketplace_price_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
    or new.price is distinct from old.price
    or new.listing_type is distinct from old.listing_type then
    insert into public.marketplace_price_snapshots (listing_id, price, listing_type)
    values (new.id, new.price, new.listing_type);
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_listing_price_snapshot on public.marketplace_listings;
create trigger marketplace_listing_price_snapshot
  after insert or update of price, listing_type on public.marketplace_listings
  for each row execute function public.sync_marketplace_price_snapshot();

-- Mevcut ilanlar için başlangıç snapshot'ı
insert into public.marketplace_price_snapshots (listing_id, price, listing_type, recorded_at)
select l.id, l.price, l.listing_type, l.created_at
from public.marketplace_listings l
where not exists (
  select 1 from public.marketplace_price_snapshots s where s.listing_id = l.id
);

create or replace function public.marketplace_price_history(
  p_listing_id uuid,
  p_days integer default 21
)
returns table (
  day date,
  price numeric,
  listing_type public.marketplace_listing_type
)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (p_days - 1)),
      current_date,
      interval '1 day'
    )::date as day
  ),
  daily as (
    select distinct on (s.listing_id, (s.recorded_at at time zone 'utc')::date)
      (s.recorded_at at time zone 'utc')::date as day,
      s.price,
      s.listing_type
    from public.marketplace_price_snapshots s
    where s.listing_id = p_listing_id
      and s.recorded_at >= (current_date - (p_days - 1))
    order by s.listing_id, (s.recorded_at at time zone 'utc')::date, s.recorded_at desc
  )
  select
    d.day,
    coalesce(
      daily.price,
      (
        select s2.price
        from public.marketplace_price_snapshots s2
        where s2.listing_id = p_listing_id
          and (s2.recorded_at at time zone 'utc')::date <= d.day
        order by s2.recorded_at desc
        limit 1
      )
    ) as price,
    coalesce(
      daily.listing_type,
      (
        select s3.listing_type
        from public.marketplace_price_snapshots s3
        where s3.listing_id = p_listing_id
          and (s3.recorded_at at time zone 'utc')::date <= d.day
        order by s3.recorded_at desc
        limit 1
      )
    ) as listing_type
  from days d
  left join daily on daily.day = d.day
  order by d.day asc;
$$;

grant execute on function public.marketplace_price_history(uuid, integer) to anon, authenticated;
