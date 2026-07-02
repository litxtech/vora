-- Ses süresi ve yükleme limiti: sıkıştırma ile uzun sesler desteklenir

alter table public.sounds
  drop constraint if exists sounds_duration_max;

alter table public.sounds
  add constraint sounds_duration_positive
  check (duration_sec > 0);

update storage.buckets
set file_size_limit = 104857600
where id = 'user-sounds';
