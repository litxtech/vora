-- IBAN altı banka bilgileri + admin/moderator profil okuma

alter table public.profiles
  add column if not exists bank_name text,
  add column if not exists bank_account_name text;

alter table public.profiles
  drop constraint if exists profiles_bank_name_length_check;

alter table public.profiles
  add constraint profiles_bank_name_length_check
  check (bank_name is null or char_length(trim(bank_name)) between 1 and 120);

alter table public.profiles
  drop constraint if exists profiles_bank_account_name_length_check;

alter table public.profiles
  add constraint profiles_bank_account_name_length_check
  check (bank_account_name is null or char_length(trim(bank_account_name)) between 1 and 160);

-- Moderator/admin tüm profilleri okuyabilsin (admin panel detay)
drop policy if exists "profiles_staff_read" on public.profiles;

create policy "profiles_staff_read" on public.profiles
  for select using (public.is_moderator());

create or replace function public.admin_get_user_email(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_moderator() then
    raise exception 'Unauthorized';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  return v_email;
end;
$$;

grant execute on function public.admin_get_user_email(uuid) to authenticated;
