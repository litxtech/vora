-- Bağlı kardeş işletme hesabında profil adı yerine işletme adını döndür

create or replace function public.get_linked_sibling_profile()
returns table (
  sibling_id uuid,
  sibling_username text,
  sibling_account_type public.account_type,
  sibling_avatar_url text,
  sibling_full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.account_type,
    coalesce(b.logo_url, p.avatar_url),
    case
      when p.account_type = 'business' then coalesce(nullif(trim(b.name), ''), nullif(trim(p.full_name), ''), p.username)
      else coalesce(nullif(trim(p.full_name), ''), p.username)
    end
  from public.linked_accounts la
  join public.profiles p on p.id = case
    when la.personal_user_id = auth.uid() then la.business_user_id
    when la.business_user_id = auth.uid() then la.personal_user_id
    else null
  end
  left join public.businesses b on b.owner_id = p.id and p.account_type = 'business'
  where auth.uid() in (la.personal_user_id, la.business_user_id)
  limit 1;
$$;
