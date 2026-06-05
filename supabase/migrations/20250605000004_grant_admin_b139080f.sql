-- Admin yetkisi: b139080f-f55d-4fdc-b82e-f6aee57a1a78
update public.profiles
set
  role = 'admin',
  is_verified = true,
  updated_at = now()
where id = 'b139080f-f55d-4fdc-b82e-f6aee57a1a78';
