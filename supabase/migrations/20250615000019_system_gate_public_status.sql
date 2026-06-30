-- Zorunlu güncelleme ve bakım modu: genişletilmiş yapılandırma + herkese açık durum RPC

update public.app_system_config
set value = value || jsonb_build_object(
  'enabled', false,
  'title', 'Güncelleme gerekli',
  'message', 'Vora''nın yeni sürümünü kullanmak için lütfen uygulamayı güncelleyin.',
  'changelog', '',
  'admin_note', '',
  'ios_store_url', '',
  'android_store_url', ''
)
where key = 'min_app_version'
  and not (value ? 'title');

update public.app_system_config
set value = value || jsonb_build_object(
  'title', 'Bakım çalışması',
  'admin_note', '',
  'estimated_end', null
)
where key = 'maintenance_mode'
  and not (value ? 'title');

create or replace function public.get_app_system_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_min jsonb;
  v_maint jsonb;
begin
  select value into v_min from public.app_system_config where key = 'min_app_version';
  select value into v_maint from public.app_system_config where key = 'maintenance_mode';

  return jsonb_build_object(
    'min_app_version', coalesce(v_min, '{}'::jsonb) - 'admin_note',
    'maintenance_mode', coalesce(v_maint, '{}'::jsonb) - 'admin_note'
  );
end;
$$;

grant execute on function public.get_app_system_status() to anon, authenticated;
