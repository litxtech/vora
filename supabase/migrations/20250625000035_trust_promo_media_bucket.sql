-- Tatil promosyon kartı görselleri için depolama

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-appearance-media',
  'app-appearance-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists app_appearance_media_read on storage.objects;
create policy app_appearance_media_read on storage.objects
  for select
  using (bucket_id = 'app-appearance-media');

drop policy if exists app_appearance_media_admin_insert on storage.objects;
create policy app_appearance_media_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-appearance-media'
    and public.is_moderator()
  );

drop policy if exists app_appearance_media_admin_update on storage.objects;
create policy app_appearance_media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'app-appearance-media' and public.is_moderator());

drop policy if exists app_appearance_media_admin_delete on storage.objects;
create policy app_appearance_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'app-appearance-media' and public.is_moderator());
