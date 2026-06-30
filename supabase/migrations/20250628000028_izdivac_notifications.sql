-- İzdivaç bildirim ses ayarları

insert into public.notification_sound_settings (event_type, label) values
  ('izdivac_post_comment', 'İzdivaç Yorumu'),
  ('izdivac_post_join', 'İzdivaç Katılım'),
  ('izdivac_invite_received', 'İzdivaç Daveti'),
  ('izdivac_invite_accepted', 'İzdivaç Davet Kabul')
on conflict (event_type) do nothing;
