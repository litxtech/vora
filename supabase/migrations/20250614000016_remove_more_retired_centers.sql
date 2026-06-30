-- Kaldırılan merkezler: deals, poll, verification, traffic, volunteer (help ile birleşti)
delete from public.app_feature_flags
where feature_id in ('deals', 'poll', 'verification', 'traffic', 'volunteer');
