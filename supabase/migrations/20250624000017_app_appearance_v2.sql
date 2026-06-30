-- Görünüm config v2: spacing, radius, tipografi, tab bar, feed banner, merkezler, branding

update public.app_system_config
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object(
  'version', 2,
  'spacing', coalesce(value->'spacing', '{}'::jsonb),
  'radius', coalesce(value->'radius', '{}'::jsonb),
  'typography', coalesce(value->'typography', '{}'::jsonb),
  'tab_bar', coalesce(value->'tab_bar', jsonb_build_object('dark', '{}'::jsonb, 'light', '{}'::jsonb)),
  'feed', coalesce(value->'feed', jsonb_build_object(
    'banner', jsonb_build_object(
      'enabled', false,
      'title', '',
      'message', '',
      'tone', 'info',
      'dismissible', true
    )
  )),
  'centers_hub', coalesce(value->'centers_hub', jsonb_build_object(
    'title', 'Merkezler',
    'subtitle', 'Topluluk, harita ve ekonomi — hepsi tek yerde'
  )),
  'branding', coalesce(value->'branding', '{}'::jsonb)
)
where key = 'app_appearance';
