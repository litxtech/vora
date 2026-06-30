-- Pixabay CDN doğrudan indirmeyi 403 ile engelliyor; örnek parça URL'lerini çalışan demo adreslerle güncelle.

with numbered as (
  select
    id,
    row_number() over (order by sort_order, created_at) - 1 as idx
  from public.music_tracks
  where audio_url like '%pixabay.com%'
)
update public.music_tracks t
set
  audio_url = (array[
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  ])[1 + (n.idx % 5)],
  duration_seconds = greatest(duration_seconds, 60),
  updated_at = now()
from numbered n
where t.id = n.id;
