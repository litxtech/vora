-- İzdivaç duvar medyası (ana feed post-media'dan ayrı)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'izdivac-media',
  'izdivac-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "İzdivaç medyası okuma" on storage.objects;
create policy "İzdivaç medyası okuma"
on storage.objects for select
to authenticated
using (bucket_id = 'izdivac-media' and public.izdivac_has_access());

drop policy if exists "İzdivaç medyası yükleme" on storage.objects;
create policy "İzdivaç medyası yükleme"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'izdivac-media'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.izdivac_has_access()
);

drop policy if exists "İzdivaç medyası silme" on storage.objects;
create policy "İzdivaç medyası silme"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'izdivac-media'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.izdivac_has_access()
);
