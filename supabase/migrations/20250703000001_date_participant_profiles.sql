-- Date katılımcı profilleri: görünürlük kısıtına takılmadan snippet + arama

create or replace function public.date_participant_snippets(p_user_ids uuid[])
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  gender text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.gender::text
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and coalesce(p.account_status, 'active') = 'active'
    and (
      public.date_has_access(auth.uid())
      or p.id = auth.uid()
    );
$$;

create or replace function public.search_date_users(p_query text, p_limit int default 12)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  gender text
)
language sql
stable
security definer
set search_path = auth, public
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
    p.gender::text
  from public.profiles p
  cross join normalized n
  where public.date_has_access(auth.uid())
    and length(n.q) >= 2
    and p.id is distinct from auth.uid()
    and public.date_has_access(p.id)
    and coalesce(p.account_status, 'active') = 'active'
    and coalesce(p.is_guest, false) = false
    and (
      lower(p.username) like '%' || n.q || '%'
      or lower(coalesce(p.full_name, '')) like '%' || n.q || '%'
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
    p.username
  limit greatest(coalesce(p_limit, 12), 1);
$$;

revoke all on function public.date_participant_snippets(uuid[]) from public;
revoke all on function public.search_date_users(text, int) from public;

grant execute on function public.date_participant_snippets(uuid[]) to authenticated;
grant execute on function public.search_date_users(text, int) to authenticated;
