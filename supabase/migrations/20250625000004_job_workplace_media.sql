-- İş ilanları: işyeri görselleri (opsiyonel)

alter table public.job_listings
  add column if not exists workplace_media_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-listings',
  'job-listings',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists "job_listings_storage_read" on storage.objects;
create policy "job_listings_storage_read" on storage.objects
  for select using (bucket_id = 'job-listings');

drop policy if exists "job_listings_storage_insert" on storage.objects;
create policy "job_listings_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "job_listings_storage_update" on storage.objects;
create policy "job_listings_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'job-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "job_listings_storage_delete" on storage.objects;
create policy "job_listings_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'job-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
