-- Admin hesapları başka kullanıcıların profil fotoğrafı ve kapak görsellerini yükleyebilir.

create policy "Admin herhangi bir avatar yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.is_admin()
);

create policy "Admin herhangi bir avatarı güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.is_admin()
);

create policy "Admin herhangi bir kapak yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'covers'
  and public.is_admin()
);

create policy "Admin herhangi bir kapağı güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'covers'
  and public.is_admin()
);

insert into public.admin_role_permissions (role, permission_key, allowed)
values
  ('admin', 'users.edit', true),
  ('super_admin', 'users.edit', true)
on conflict (role, permission_key) do update
  set allowed = excluded.allowed;
