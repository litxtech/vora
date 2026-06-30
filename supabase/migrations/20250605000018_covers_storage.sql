-- Kapak görselleri için storage bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "Kapak görselleri herkese açık"
on storage.objects for select
using (bucket_id = 'covers');

create policy "Kullanıcı kendi kapağını yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı kendi kapağını güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı kendi kapağını silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);
