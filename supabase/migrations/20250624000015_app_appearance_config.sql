-- Canlı uygulama görünümü: renkler, lobi metinleri ve bilgilendirme banner'ları (build gerektirmez)

insert into public.app_system_config (key, value)
values (
  'app_appearance',
  jsonb_build_object(
    'version', 1,
    'colors', jsonb_build_object('dark', '{}'::jsonb, 'light', '{}'::jsonb),
    'gradients', jsonb_build_object('dark', '{}'::jsonb, 'light', '{}'::jsonb),
    'lobby', jsonb_build_object(
      'tagline', 'Karadeniz''in dijital topluluğu',
      'welcome_title', 'Hoş geldiniz',
      'welcome_subtitle', 'Hesabınıza giriş yapın',
      'announcements', '[]'::jsonb
    ),
    'admin_note', ''
  )
)
on conflict (key) do nothing;

-- Herkes (misafir dahil) yalnızca görünüm ayarını okuyabilir
do $pol$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_system_config'
      and policyname = 'app_system_config_public_appearance_read'
  ) then
    create policy app_system_config_public_appearance_read
      on public.app_system_config
      for select
      to anon, authenticated
      using (key = 'app_appearance');
  end if;
end $pol$;

create or replace function public.get_app_appearance_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value - 'admin_note' from public.app_system_config where key = 'app_appearance'),
    '{}'::jsonb
  );
$$;

grant execute on function public.get_app_appearance_config() to anon, authenticated;

do $pub$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_system_config'
  ) then
    alter publication supabase_realtime add table public.app_system_config;
  end if;
end $pub$;

alter table public.app_system_config replica identity full;
