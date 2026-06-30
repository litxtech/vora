-- İzdivaç duvarı: canlı akış (realtime) için publication kaydı

alter table public.izdivac_posts replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'izdivac_posts'
  ) then
    alter publication supabase_realtime add table public.izdivac_posts;
  end if;
end;
$$;
