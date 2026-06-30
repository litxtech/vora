-- Merkezler hub: admin panelinden yönetilen öne çıkan merkez listesi

update public.app_system_config
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{centers_hub,featured_center_ids}',
  coalesce(
    value->'centers_hub'->'featured_center_ids',
    '["marketplace", "rides"]'::jsonb
  ),
  true
)
where key = 'app_appearance';
