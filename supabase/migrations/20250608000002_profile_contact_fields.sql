-- Profil iletişim alanları

alter table public.profiles
  add column if not exists address text,
  add column if not exists iban text;

alter table public.profiles
  add constraint profiles_iban_format_check
  check (iban is null or iban ~ '^TR[0-9]{24}$');
