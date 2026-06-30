-- Enum değerleri eklendikten sonra ses ayarları

insert into public.notification_sound_settings (event_type, label) values
  ('trust_milestone_80', 'Güven Puanı 80'),
  ('trust_reward_pool', 'Tatil Havuzu')
on conflict (event_type) do nothing;
