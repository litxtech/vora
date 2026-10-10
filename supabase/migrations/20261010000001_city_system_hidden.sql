-- Şehir sistemi uygulamada kapalı başlar. Admin özellik bayraklarından açabilir.

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('city-system', 'Şehir Sistemi', 'social', false)
on conflict (feature_id) do update
  set is_button_visible = false,
      updated_at = now();
