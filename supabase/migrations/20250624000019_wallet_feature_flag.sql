-- Kuru → Cüzdan: kullanıcıya dönük özellik bayrağı wallet olarak taşınır.

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
select
  'wallet',
  'Cüzdan',
  coalesce(ff.feature_group, 'programs'),
  coalesce(ff.is_button_visible, true)
from public.app_feature_flags ff
where ff.feature_id = 'kuru'
on conflict (feature_id) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  is_button_visible = coalesce(
    public.app_feature_flags.is_button_visible,
    excluded.is_button_visible
  ),
  updated_at = now();

insert into public.app_feature_flags (feature_id, label, feature_group)
values ('wallet', 'Cüzdan', 'programs')
on conflict (feature_id) do update
set label = excluded.label, updated_at = now();

delete from public.app_feature_flags where feature_id = 'kuru';
