insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('incident-graph', 'Canlı Olay Grafiği', 'actions', true)
on conflict (feature_id) do nothing;
