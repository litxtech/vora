-- Yerel Pazar — aynı ürün varyantları (renk, kapasite vb.)

alter table public.marketplace_listings
  add column if not exists variant_group_id uuid,
  add column if not exists source_listing_id uuid references public.marketplace_listings (id) on delete set null;

create index if not exists marketplace_listings_variant_group_idx
  on public.marketplace_listings (variant_group_id, status, created_at desc)
  where variant_group_id is not null;
