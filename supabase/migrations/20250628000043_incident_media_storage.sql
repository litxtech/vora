-- Canlı Nabız: olay fotoğraf/video depolaması
-- Olaylar herkese açık okunduğu için bucket public; yükleme/silme yalnızca kendi klasörüne.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-media',
  'incident-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "Olay medyası okuma" on storage.objects;
create policy "Olay medyası okuma"
on storage.objects for select
using (bucket_id = 'incident-media');

drop policy if exists "Olay medyası yükleme" on storage.objects;
create policy "Olay medyası yükleme"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'incident-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Olay medyası silme" on storage.objects;
create policy "Olay medyası silme"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'incident-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
