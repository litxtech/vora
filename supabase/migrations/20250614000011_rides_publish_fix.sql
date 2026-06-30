-- Bozuk kalkış saati düzeltmesi + taslakta kalmış yayın adaylarını onar

update public.ride_trips
set departure_time = (
  (substring(departure_time::text from '^(\d{1,2}:\d{2})') || ':00')
)::time
where departure_time::text ~ '^\d{1,2}:\d{2}:\d$';

update public.ride_trips
set
  status = 'published',
  published_at = coalesce(published_at, updated_at, created_at),
  updated_at = now()
where status = 'draft'
  and published_at is not null;
