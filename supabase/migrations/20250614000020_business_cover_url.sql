-- İşletme kapak görseli

alter table public.businesses
  add column if not exists cover_url text;
