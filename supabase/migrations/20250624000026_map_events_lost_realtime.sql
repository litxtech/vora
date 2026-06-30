-- Harita canlı güncellemesi: etkinlik ve kayıp ilanı silme / durum değişimi

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lost_items'
  ) then
    alter publication supabase_realtime add table public.lost_items;
  end if;
end $$;

alter table public.events replica identity full;
alter table public.lost_items replica identity full;
