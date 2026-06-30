-- Mesajlaşma: gerçek çevrimiçi durumu (is_online) ve son görülme

alter table public.profiles
  add column if not exists is_online boolean not null default false;

create index if not exists profiles_is_online_idx
  on public.profiles (is_online)
  where is_online = true;

drop function if exists public.get_conversation_detail(uuid);

create function public.get_conversation_detail(p_conversation_id uuid)
returns table (
  id uuid,
  conversation_type public.conversation_type,
  title text,
  avatar_url text,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  other_is_verified boolean,
  other_last_seen_at timestamptz,
  other_is_online boolean,
  other_last_read_at timestamptz,
  member_count bigint,
  my_role public.conversation_member_role
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.type as conversation_type,
    c.title,
    c.avatar_url,
    other_p.id as other_user_id,
    other_p.username as other_username,
    other_p.full_name as other_full_name,
    other_p.avatar_url as other_avatar_url,
    other_p.is_verified as other_is_verified,
    other_p.last_seen_at as other_last_seen_at,
    coalesce(other_p.is_online, false) as other_is_online,
    other_cm.last_read_at as other_last_read_at,
    (
      select count(*)::bigint
      from public.conversation_members cm_all
      where cm_all.conversation_id = c.id
    ) as member_count,
    my_cm.role as my_role
  from public.conversations c
  join public.conversation_members my_cm
    on my_cm.conversation_id = c.id and my_cm.user_id = auth.uid()
  left join lateral (
    select ocm.user_id, ocm.last_read_at
    from public.conversation_members ocm
    where ocm.conversation_id = c.id
      and ocm.user_id <> auth.uid()
      and c.type = 'direct'
    limit 1
  ) other_cm on true
  left join lateral (
    select p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.last_seen_at, p.is_online
    from public.profiles p
    where p.id = other_cm.user_id
  ) other_p on true
  where c.id = p_conversation_id
    and not (
      c.type = 'direct'
      and other_p.id is not null
      and public.is_user_blocked(auth.uid(), other_p.id)
    );
$$;

grant execute on function public.get_conversation_detail(uuid) to authenticated;
