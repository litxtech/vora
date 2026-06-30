-- Admin/moderator işletme belgesi okuma erişimi (storage RLS)

drop policy if exists "İşletme belgeleri admin okuyabilir" on storage.objects;
create policy "İşletme belgeleri admin okuyabilir"
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-documents'
  and public.is_moderator()
);
