-- Yakınlık eşleşmesi: presence değişikliklerinde anlık aday kontrolü

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'proximity_match_presence'
  ) then
    alter publication supabase_realtime add table public.proximity_match_presence;
  end if;
end $$;
