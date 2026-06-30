-- İhbar Hattı → Platform İhbar (özellik bayrağı etiketi)

update public.app_feature_flags
set label = 'Platform İhbar'
where feature_id = 'tip-line';
