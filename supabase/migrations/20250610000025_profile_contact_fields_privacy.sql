-- Profil iletişim / banka alanları: yalnızca sahip (RPC) ve moderatör okuyabilir.

create or replace function public.get_own_profile_contact_fields()
returns table (
  address text,
  iban text,
  bank_name text,
  bank_account_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.address, p.iban, p.bank_name, p.bank_account_name
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.admin_get_user_contact_fields(p_user_id uuid)
returns table (
  address text,
  iban text,
  bank_name text,
  bank_account_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select p.address, p.iban, p.bank_name, p.bank_account_name
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

grant execute on function public.get_own_profile_contact_fields() to authenticated;
grant execute on function public.admin_get_user_contact_fields(uuid) to authenticated;

revoke select (address, iban, bank_name, bank_account_name) on public.profiles from authenticated;
revoke select (address, iban, bank_name, bank_account_name) on public.profiles from anon;
