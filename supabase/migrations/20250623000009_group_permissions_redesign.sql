-- Grup yetkileri: üye ekleme/çıkarma yalnızca kurucu ve yönetici; grup silme kurucuya özel

create or replace function public.add_group_members(
  p_conversation_id uuid,
  p_member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.conversation_member_role;
  v_member_id uuid;
  v_added integer := 0;
  v_rows integer;
begin
  v_role := public.get_my_conversation_role(p_conversation_id);
  if v_role is null or v_role not in ('founder', 'admin') then
    raise exception 'Üye ekleme yetkiniz yok';
  end if;

  foreach v_member_id in array coalesce(p_member_ids, array[]::uuid[])
  loop
    if v_member_id is not null then
      if not exists (
        select 1 from public.user_blocks b
        join public.conversation_members cm on cm.conversation_id = p_conversation_id and cm.user_id = auth.uid()
        where (b.blocker_id = auth.uid() and b.blocked_id = v_member_id)
           or (b.blocker_id = v_member_id and b.blocked_id = auth.uid())
      ) then
        insert into public.conversation_members (conversation_id, user_id, role)
        values (p_conversation_id, v_member_id, 'member')
        on conflict do nothing;
        get diagnostics v_rows = row_count;
        v_added := v_added + v_rows;
      end if;
    end if;
  end loop;

  return v_added;
end;
$$;

create or replace function public.update_group_conversation(
  p_conversation_id uuid,
  p_title text default null,
  p_avatar_url text default null,
  p_remove_avatar boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.conversation_member_role;
begin
  v_role := public.get_my_conversation_role(p_conversation_id);
  if v_role not in ('founder', 'admin') then
    raise exception 'Grup düzenleme yetkiniz yok';
  end if;

  update public.conversations
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    avatar_url = case
      when p_remove_avatar then null
      when p_avatar_url is not null then p_avatar_url
      else avatar_url
    end,
    updated_at = now()
  where id = p_conversation_id and type = 'group';

  return found;
end;
$$;

create or replace function public.delete_group_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.conversation_member_role;
begin
  v_role := public.get_my_conversation_role(p_conversation_id);
  if v_role <> 'founder' then
    raise exception 'Grubu yalnızca kurucu silebilir';
  end if;

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and type = 'group'
  ) then
    return false;
  end if;

  delete from public.conversations
  where id = p_conversation_id and type = 'group';

  return true;
end;
$$;
