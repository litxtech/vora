-- Otel ilanları: Vora özel fiyat + isteğe bağlı liste fiyatı

alter table public.hotel_listings
  add column if not exists list_price_per_night integer
    check (list_price_per_night is null or list_price_per_night >= 0);

comment on column public.hotel_listings.price_per_night is
  'Vora uygulaması üzerinden geçerli gece fiyatı (Vora özel fiyat).';
comment on column public.hotel_listings.list_price_per_night is
  'İsteğe bağlı karşılaştırma/liste fiyatı; Vora özel fiyatın üstünde gösterilir.';
