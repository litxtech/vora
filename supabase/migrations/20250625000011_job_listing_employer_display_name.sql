-- İlan kartında gösterilecek işletme / ilanveren adı (bireysel paylaşımlar için)
alter table public.job_listings
  add column if not exists employer_display_name text;

comment on column public.job_listings.employer_display_name is
  'Akış ve ilan kartında görünen işletme adı; boşsa bağlı businesses.name kullanılır.';
