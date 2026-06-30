-- İşletme / bireysel hesap bağlama ekranında kullanıcı adı önerileri

create or replace function public.search_linkable_sibling_accounts(
  p_query text,
  p_account_type public.account_type,
  p_limit int default 8
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified
  from public.profiles p
  where p.id <> auth.uid()
    and p.account_type = p_account_type
    and coalesce(p.account_status, 'active') = 'active'
    and length(trim(coalesce(p_query, ''))) >= 2
    and (
      p.username ilike '%' || trim(p_query) || '%'
      or p.full_name ilike '%' || trim(p_query) || '%'
    )
    and not exists (
      select 1
      from public.linked_accounts la
      where la.personal_user_id = p.id or la.business_user_id = p.id
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by
    case when p.username ilike trim(p_query) || '%' then 0 else 1 end,
    case when p.full_name ilike trim(p_query) || '%' then 0 else 1 end,
    p.username
  limit greatest(p_limit, 1);
$$;

revoke all on function public.search_linkable_sibling_accounts(text, public.account_type, int) from public;
grant execute on function public.search_linkable_sibling_accounts(text, public.account_type, int) to authenticated;
