-- Vora Hizmetler: tab menüsünden merkezlere taşındı
update public.app_feature_flags
set feature_group = 'centers', label = 'Vora Hizmetler'
where feature_id = 'vora-hizmetler';

update public.app_feature_flags
set feature_group = 'centers'
where feature_id like 'vora-hizmetler.%';
