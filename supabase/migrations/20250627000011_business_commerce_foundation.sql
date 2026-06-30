-- İşletme ticaret altyapısı: mağaza modu, vitrin, otel bağlantısı

create type public.business_commerce_mode as enum ('none', 'ecommerce', 'hotel', 'both');

alter table public.businesses
  add column if not exists commerce_mode public.business_commerce_mode not null default 'none',
  add column if not exists shop_tagline text,
  add column if not exists shop_accent text,
  add column if not exists shop_published boolean not null default false;

alter table public.hotel_listings
  add column if not exists business_id uuid references public.businesses (id) on delete set null;

create index if not exists hotel_listings_business_idx
  on public.hotel_listings (business_id)
  where business_id is not null;

create index if not exists businesses_shop_published_idx
  on public.businesses (shop_published, registration_status)
  where shop_published = true and registration_status = 'approved';

drop policy if exists "businesses_owner_update_shop" on public.businesses;
create policy "businesses_owner_update_shop" on public.businesses
  for update to authenticated
  using (owner_id = auth.uid() and registration_status = 'approved')
  with check (owner_id = auth.uid());

grant usage on type public.business_commerce_mode to authenticated;

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('business-center', 'İşletme Mağazaları', 'centers', true)
on conflict (feature_id) do nothing;
