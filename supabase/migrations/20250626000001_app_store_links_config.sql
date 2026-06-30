-- Uygulama mağaza paylaşım linkleri: admin'den yönetilir, ayarlar ekranında canlı yansır

insert into public.app_system_config (key, value)
values (
  'app_store_links',
  jsonb_build_object(
    'ios_url', 'https://apps.apple.com/tr/app/vora-x/id6777120091?l=tr',
    'android_url', '',
    'title', 'Vora X''i Keşfet',
    'subtitle', 'Karadeniz''in canlı dijital ağı',
    'share_message', 'Karadeniz''in dijital topluluğu Vora''ya katıl! Yerel haber, etkinlik ve topluluk tek uygulamada.',
    'utm_source', 'vora',
    'utm_medium', 'app_share',
    'utm_campaign', 'user_referral',
    'admin_note', ''
  )
)
on conflict (key) do nothing;

do $pol$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_system_config'
      and policyname = 'app_system_config_public_store_links_read'
  ) then
    create policy app_system_config_public_store_links_read
      on public.app_system_config
      for select
      to anon, authenticated
      using (key = 'app_store_links');
  end if;
end $pol$;

create or replace function public.get_app_store_links_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value - 'admin_note' from public.app_system_config where key = 'app_store_links'),
    '{}'::jsonb
  );
$$;

grant execute on function public.get_app_store_links_config() to anon, authenticated;
