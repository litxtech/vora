-- Gönderi medyası için storage bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do nothing;

create policy "Post medyası herkese açık"
on storage.objects for select
using (bucket_id = 'post-media');

create policy "Kullanıcı kendi post medyasını yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı kendi post medyasını güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı kendi post medyasını silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
