-- Harita katmanları: silme / durum değişimi canlı güncellemesi

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'incident_reports',
    'traffic_reports',
    'marketplace_listings',
    'vora_needs',
    'job_listings',
    'staff_requests',
    'job_seekers',
    'tourism_places'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

alter table public.incident_reports replica identity full;
alter table public.traffic_reports replica identity full;
alter table public.marketplace_listings replica identity full;
alter table public.vora_needs replica identity full;
alter table public.job_listings replica identity full;
alter table public.staff_requests replica identity full;
alter table public.job_seekers replica identity full;
alter table public.tourism_places replica identity full;
