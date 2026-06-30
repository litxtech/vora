-- Topluluğa yönetici/moderatör/kurucu tarafından üye ekleme

create or replace function public.add_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.community_member_role;
begin
  if p_user_id is null then
    raise exception 'Kullanıcı gerekli';
  end if;

  select role into v_my_role
  from public.community_members
  where community_id = p_community_id and user_id = auth.uid();

  if p_user_id = auth.uid() then
    insert into public.community_members (community_id, user_id, role)
    values (p_community_id, p_user_id, 'member')
    on conflict (community_id, user_id) do nothing;
    return;
  end if;

  if v_my_role not in ('owner', 'admin', 'moderator') then
    raise exception 'Yetkiniz yok';
  end if;

  if exists (
    select 1 from public.community_members
    where community_id = p_community_id and user_id = p_user_id
  ) then
    return;
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (p_community_id, p_user_id, 'member');
end;
$$;

grant execute on function public.add_community_member(uuid, uuid) to authenticated;
