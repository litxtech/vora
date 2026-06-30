-- İşletme logo/kapak: avatars bucket'ta işletme klasörü veya sahip klasörü

drop policy if exists "İşletme sahibi branding yükleyebilir" on storage.objects;
create policy "İşletme sahibi branding yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = auth.uid()
      and (
        b.id::text = (storage.foldername(name))[1]
        or auth.uid()::text = (storage.foldername(name))[1]
      )
  )
);

drop policy if exists "İşletme sahibi branding güncelleyebilir" on storage.objects;
create policy "İşletme sahibi branding güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = auth.uid()
      and (
        b.id::text = (storage.foldername(name))[1]
        or auth.uid()::text = (storage.foldername(name))[1]
      )
  )
);

drop policy if exists "İşletme sahibi branding silebilir" on storage.objects;
create policy "İşletme sahibi branding silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = auth.uid()
      and (
        b.id::text = (storage.foldername(name))[1]
        or auth.uid()::text = (storage.foldername(name))[1]
      )
  )
);

-- Onay bekleyen işletmeler de logo/kapak güncelleyebilsin
drop policy if exists "businesses_owner_update_branding" on public.businesses;
create policy "businesses_owner_update_branding" on public.businesses
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
