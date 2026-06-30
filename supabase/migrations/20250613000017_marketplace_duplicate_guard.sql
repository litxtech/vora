-- Yerel Pazar — çoklu ilan, kopya / mükerrer ilan engeli

alter table public.marketplace_listings
  add column if not exists listing_fingerprint text;

create or replace function public.marketplace_listing_fingerprint(
  p_title text,
  p_cover_url text,
  p_media_urls text[]
)
returns text
language sql
immutable
as $$
  select md5(
    lower(trim(coalesce(p_title, ''))) || '|' ||
    coalesce(
      nullif(trim(coalesce(p_cover_url, '')), ''),
      nullif(trim(coalesce(p_media_urls[1], '')), ''),
      ''
    )
  );
$$;

update public.marketplace_listings
set listing_fingerprint = public.marketplace_listing_fingerprint(title, cover_url, media_urls)
where listing_fingerprint is null;

-- Eski mükerrer aktif ilanlarda en yeniyi bırak
with ranked as (
  select
    id,
    row_number() over (
      partition by author_id, listing_fingerprint
      order by created_at desc
    ) as rn
  from public.marketplace_listings
  where status in ('active', 'reserved')
    and listing_fingerprint is not null
)
update public.marketplace_listings l
set status = 'removed', updated_at = now()
from ranked r
where l.id = r.id and r.rn > 1;

create or replace function public.marketplace_guard_listing_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_today_count int;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  new.listing_fingerprint := public.marketplace_listing_fingerprint(
    new.title,
    new.cover_url,
    new.media_urls
  );

  if tg_op = 'INSERT' then
    v_day_start := date_trunc('day', now() at time zone 'Europe/Istanbul')
      at time zone 'Europe/Istanbul';
    v_day_end := v_day_start + interval '1 day';

    select count(*)::int into v_today_count
    from public.marketplace_listings
    where author_id = new.author_id
      and created_at >= v_day_start
      and created_at < v_day_end;

    if v_today_count >= 5 then
      raise exception 'MARKETPLACE_DAILY_LIMIT'
        using hint = 'Günde en fazla 5 yeni ilan verilebilir.';
    end if;
  end if;

  if new.status in ('active', 'reserved') then
    if exists (
      select 1
      from public.marketplace_listings l
      where l.author_id = new.author_id
        and l.status in ('active', 'reserved')
        and l.listing_fingerprint = new.listing_fingerprint
        and l.id is distinct from new.id
    ) then
      raise exception 'MARKETPLACE_DUPLICATE'
        using hint = 'Aynı ürün için zaten aktif ilan var.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists marketplace_listings_guard on public.marketplace_listings;
create trigger marketplace_listings_guard
  before insert or update of title, cover_url, media_urls, status
  on public.marketplace_listings
  for each row execute function public.marketplace_guard_listing_rules();

create unique index if not exists marketplace_listings_author_fingerprint_active_idx
  on public.marketplace_listings (author_id, listing_fingerprint)
  where status in ('active', 'reserved')
    and content_status = 'published'
    and listing_fingerprint is not null;
