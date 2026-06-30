-- Vora İkonu: kolon, senkronizasyon, admin RPC ve mesajlaşma detayı

alter table public.profiles
  add column if not exists is_platform_charm boolean not null default false;

create or replace function public.sync_platform_charm_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  select exists (
    select 1 from public.user_badges
    where user_id = p_user_id and badge_type = 'platform_charm'
  ) into v_active;

  update public.profiles
  set is_platform_charm = v_active, updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.on_platform_charm_badge_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_platform_charm_status(old.user_id);
    return old;
  end if;

  if new.badge_type = 'platform_charm' or (tg_op = 'UPDATE' and old.badge_type = 'platform_charm') then
    perform public.sync_platform_charm_status(coalesce(new.user_id, old.user_id));
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists user_badges_platform_charm_sync on public.user_badges;
create trigger user_badges_platform_charm_sync
  after insert or update or delete on public.user_badges
  for each row
  execute function public.on_platform_charm_badge_change();

update public.profiles p
set is_platform_charm = true
where exists (
  select 1 from public.user_badges b
  where b.user_id = p.id and b.badge_type = 'platform_charm'
);

create or replace function public.admin_grant_platform_charm(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  insert into public.user_badges (user_id, badge_type, earned_at)
  values (p_user_id, 'platform_charm', now())
  on conflict (user_id, badge_type) do nothing;

  perform public.sync_platform_charm_status(p_user_id);

  perform public.notify_profile_user(
    p_user_id,
    'badge_earned',
    'Vora İkonu',
    'Tebrikler! Vora platformunun özel ikon rozeti size verildi.',
    jsonb_build_object('badgeType', 'platform_charm')
  );
end;
$$;

create or replace function public.admin_revoke_platform_charm(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  delete from public.user_badges
  where user_id = p_user_id and badge_type = 'platform_charm';

  perform public.sync_platform_charm_status(p_user_id);
end;
$$;

grant execute on function public.admin_grant_platform_charm(uuid) to authenticated;
grant execute on function public.admin_revoke_platform_charm(uuid) to authenticated;

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
  other_is_platform_charm boolean,
  other_last_seen_at timestamptz,
  other_is_online boolean,
  other_last_active_at timestamptz,
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
    other_p.is_platform_charm as other_is_platform_charm,
    other_p.last_seen_at as other_last_seen_at,
    coalesce(other_p.is_online, false) as other_is_online,
    other_p.last_active_at as other_last_active_at,
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
    select
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.is_verified,
      p.is_platform_charm,
      p.last_seen_at,
      p.is_online,
      p.last_active_at
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
