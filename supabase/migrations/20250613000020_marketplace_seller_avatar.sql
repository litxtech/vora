-- Yerel Pazar — satıcı avatar URL'si (liste kartları için)

drop function if exists public.marketplace_listing_seller_labels(uuid[]);

create function public.marketplace_listing_seller_labels(p_listing_ids uuid[])
returns table (
  listing_id uuid,
  seller_name text,
  seller_username text,
  seller_verified boolean,
  seller_avatar_url text
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
    coalesce(p.is_verified, false),
    p.avatar_url
  from public.marketplace_listings l
  join public.profiles p on p.id = l.author_id
  where l.id = any (p_listing_ids);
$$;

grant execute on function public.marketplace_listing_seller_labels(uuid[]) to authenticated, anon;
