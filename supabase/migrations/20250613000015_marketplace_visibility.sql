-- Yerel Pazar — satıcı adı görünürlüğü (profil gizliliğinden bağımsız)

create or replace function public.marketplace_listing_seller_labels(p_listing_ids uuid[])
returns table (
  listing_id uuid,
  seller_name text,
  seller_username text,
  seller_verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    p.full_name,
    p.username,
    coalesce(p.is_verified, false)
  from public.marketplace_listings l
  join public.profiles p on p.id = l.author_id
  where l.id = any (p_listing_ids);
$$;

grant execute on function public.marketplace_listing_seller_labels(uuid[]) to authenticated, anon;

-- Keşfet: rezerve ilanlar da görünsün (satıldı/kaldırıldı hariç)
create or replace function public.search_marketplace_listings(
  p_region_id text,
  p_query text default null,
  p_category public.marketplace_category default null,
  p_listing_type public.marketplace_listing_type default null,
  p_condition public.marketplace_condition default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_sort text default 'favorites',
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.marketplace_listings
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
  select l.*
  from public.marketplace_listings l
  where l.region_id = p_region_id
    and l.content_status = 'published'
    and l.status in ('active', 'reserved')
    and (p_category is null or l.category = p_category)
    and (p_listing_type is null or l.listing_type = p_listing_type)
    and (p_condition is null or l.condition = p_condition)
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (
      v_query is null
      or l.search_vector @@ v_query
      or l.title ilike '%' || trim(p_query) || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_km is null or l.location is null
      or st_dwithin(
        l.location,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
    )
  order by
    case when p_sort = 'nearest' and l.location is not null and p_lat is not null and p_lng is not null then
      st_distance(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    else null end asc nulls last,
    case when p_sort = 'price_asc' then l.price end asc nulls last,
    case when p_sort = 'price_desc' then l.price end desc nulls last,
    case when p_sort = 'newest' then extract(epoch from l.created_at) end desc,
    l.favorite_count desc,
    l.view_count desc,
    l.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;
