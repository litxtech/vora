-- Kullanıcı adından giriş için e-posta çözümleme (yalnızca sunucu tarafı, giriş öncesi)

create or replace function public.resolve_login_email(p_username text)
returns text
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  resolved_email text;
  normalized_username text;
begin
  normalized_username := lower(trim(p_username));

  if normalized_username like '@%' then
    normalized_username := substr(normalized_username, 2);
  end if;

  if normalized_username = '' then
    return null;
  end if;

  select u.email into resolved_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = normalized_username
    and coalesce(p.account_status, 'active') <> 'deleted'
  limit 1;

  return resolved_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
