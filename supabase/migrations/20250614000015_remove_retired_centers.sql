-- Kaldırılan merkezler: nearby, city-score, delivery, daily, vora-tv
delete from public.app_feature_flags
where feature_id in ('nearby', 'city-score', 'delivery', 'daily', 'vora-tv');
