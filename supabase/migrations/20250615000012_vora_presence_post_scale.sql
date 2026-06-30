-- Vora presence: tur başına gönderi limitini yükselt (eski kurulumlar 2 ile kalmış olabilir)

update public.ai_settings
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'max_posts_per_run', 25,
  'interval_minutes', coalesce((config->>'interval_minutes')::int, 120),
  'photo_chance', coalesce((config->>'photo_chance')::numeric, 0.7)
)
where module = 'presence'
  and coalesce((config->>'max_posts_per_run')::int, 2) < 10;
