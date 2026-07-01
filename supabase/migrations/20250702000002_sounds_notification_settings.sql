-- Ses bildirim ses ayarları — enum değerleri 20250702000000 migration'ında eklenir

insert into public.notification_sound_settings (event_type, label) values
  ('sound_used', 'Ses Kullanımı'),
  ('sound_liked', 'Ses Beğenisi'),
  ('sound_trending', 'Ses Trend'),
  ('sound_favorited', 'Ses Favori'),
  ('sound_reported', 'Ses Şikayeti')
on conflict (event_type) do nothing;
