-- Admin ilan listesine kapak görseli
-- PostgreSQL OUT parametreleri değişince CREATE OR REPLACE yetmez; önce drop gerekir.

drop function if exists public.admin_list_marketplace_listings(int);

create function public.admin_list_marketplace_listings(p_limit int default 50)
returns table (
  id uuid,
  title text,
  author_id uuid,
  region_id text,
  category public.marketplace_category,
  status public.marketplace_listing_status,
  content_status public.content_status,
  price numeric,
  favorite_count int,
  cover_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.author_id,
    l.region_id,
    l.category,
    l.status,
    l.content_status,
    l.price,
    l.favorite_count,
    coalesce(
      l.cover_url,
      case when cardinality(l.media_urls) > 0 then l.media_urls[1] else null end
    ) as cover_url,
    l.created_at
  from public.marketplace_listings l
  where public.is_moderator()
  order by l.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.admin_list_marketplace_listings(int) to authenticated;
