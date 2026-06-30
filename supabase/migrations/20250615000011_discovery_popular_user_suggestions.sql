-- Keşfet: kullanıcı aramada en popüler 10 hesap önerisi (takipçi sayısına göre)

create or replace function public.fetch_discover_popular_users(
  p_region_id text default null,
  p_karadeniz_wide boolean default false,
  p_exclude_user_id uuid default null,
  p_limit int default 10
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
  where coalesce(p.account_status, 'active') = 'active'
    and coalesce(p.is_guest, false) = false
    and (p_exclude_user_id is null or p.id is distinct from p_exclude_user_id)
    and (p_karadeniz_wide or p.region_id = p_region_id)
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by
    (
      select count(*)::int
      from public.follows f
      where f.following_id = p.id
    ) desc,
    p.is_verified desc,
    p.username
  limit greatest(p_limit, 1);
$$;

create or replace function public.search_discover_users(p_query text, p_limit int default 10)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean
)
language sql
security definer
set search_path = auth, public
stable
as $$
  with normalized as (
    select
      case
        when trim(coalesce(p_query, '')) like '@%'
        then substr(lower(trim(p_query)), 2)
        else lower(trim(p_query))
      end as q
  )
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join normalized n
  where length(n.q) >= 2
    and p.id is distinct from auth.uid()
    and coalesce(p.account_status, 'active') = 'active'
    and coalesce(p.is_guest, false) = false
    and (
      lower(p.username) like '%' || n.q || '%'
      or lower(coalesce(p.full_name, '')) like '%' || n.q || '%'
      or lower(coalesce(u.email, '')) like '%' || n.q || '%'
    )
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by
    case
      when lower(p.username) = n.q then 0
      when lower(p.username) like n.q || '%' then 1
      when lower(coalesce(p.full_name, '')) like n.q || '%' then 2
      else 3
    end,
    (
      select count(*)::int
      from public.follows f
      where f.following_id = p.id
    ) desc,
    p.username
  limit greatest(p_limit, 1);
$$;

revoke all on function public.fetch_discover_popular_users(text, boolean, uuid, int) from public;
grant execute on function public.fetch_discover_popular_users(text, boolean, uuid, int) to authenticated;

revoke all on function public.search_discover_users(text, int) from public;
grant execute on function public.search_discover_users(text, int) to authenticated;
