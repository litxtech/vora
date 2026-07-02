-- user-sounds bucket limitini kesin olarak 100 MB yap (eski 5 MB kurulumları için)

update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/ogg', 'video/mp4', 'video/quicktime'
  ]
where id = 'user-sounds';
