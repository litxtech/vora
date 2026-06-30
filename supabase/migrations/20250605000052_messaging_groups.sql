-- Bölüm 57 Faz 3: Grup sohbeti

create or replace function public.get_my_conversation_role(p_conversation_id uuid)
returns public.conversation_member_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.conversation_members
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
$$;

-- Grup oluştur
create or replace function public.create_group_conversation(
  p_title text,
  p_member_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_member_id uuid;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Grup adı gerekli';
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', left(trim(p_title), 80), v_user_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_user_id, 'founder');

  foreach v_member_id in array coalesce(p_member_ids, array[]::uuid[])
  loop
    if v_member_id is not null and v_member_id <> v_user_id then
      if not exists (
        select 1 from public.user_blocks
        where (blocker_id = v_user_id and blocked_id = v_member_id)
           or (blocker_id = v_member_id and blocked_id = v_user_id)
      ) then
        insert into public.conversation_members (conversation_id, user_id, role)
        values (v_conversation_id, v_member_id, 'member')
        on conflict do nothing;
      end if;
    end if;
  end loop;

  return v_conversation_id;
end;
$$;

-- Üye listesi
create or replace function public.get_conversation_members(p_conversation_id uuid)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  role public.conversation_member_role,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    cm.role,
    cm.joined_at
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = p_conversation_id
    and exists (
      select 1 from public.conversation_members mine
      where mine.conversation_id = p_conversation_id
        and mine.user_id = auth.uid()
    )
  order by
    case cm.role
      when 'founder' then 0
      when 'admin' then 1
      when 'moderator' then 2
      else 3
    end,
    cm.joined_at;
$$;

-- Üye ekle
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
  if v_role is null or v_role not in ('founder', 'admin', 'moderator') then
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

-- Üye çıkar / gruptan ayrıl
create or replace function public.remove_group_member(
  p_conversation_id uuid,
  p_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.conversation_member_role;
  v_target_role public.conversation_member_role;
begin
  v_my_role := public.get_my_conversation_role(p_conversation_id);
  if v_my_role is null then
    raise exception 'Bu gruba erişiminiz yok';
  end if;

  select role into v_target_role
  from public.conversation_members
  where conversation_id = p_conversation_id and user_id = p_member_id;

  if v_target_role is null then
    return false;
  end if;

  if p_member_id = auth.uid() then
    if v_target_role = 'founder' then
      raise exception 'Kurucu gruptan ayrılamaz. Önce kuruculuğu devredin.';
    end if;
    delete from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_member_id;
    return true;
  end if;

  if v_my_role not in ('founder', 'admin') then
    raise exception 'Üye çıkarma yetkiniz yok';
  end if;

  if v_target_role = 'founder' then
    raise exception 'Kurucu çıkarılamaz';
  end if;

  if v_my_role = 'admin' and v_target_role in ('admin', 'moderator') then
    raise exception 'Yöneticiler bu üyeyi çıkaramaz';
  end if;

  delete from public.conversation_members
  where conversation_id = p_conversation_id and user_id = p_member_id;
  return true;
end;
$$;

-- Rol güncelle
create or replace function public.update_group_member_role(
  p_conversation_id uuid,
  p_member_id uuid,
  p_role public.conversation_member_role
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.conversation_member_role;
begin
  v_my_role := public.get_my_conversation_role(p_conversation_id);
  if v_my_role not in ('founder', 'admin') then
    raise exception 'Rol değiştirme yetkiniz yok';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Kendi rolünüzü değiştiremezsiniz';
  end if;

  if p_role = 'founder' and v_my_role <> 'founder' then
    raise exception 'Kuruculuk devri yalnızca kurucu tarafından yapılabilir';
  end if;

  update public.conversation_members
  set role = p_role
  where conversation_id = p_conversation_id
    and user_id = p_member_id;

  if p_role = 'founder' and v_my_role = 'founder' then
    update public.conversation_members
    set role = 'admin'
    where conversation_id = p_conversation_id and user_id = auth.uid();
  end if;

  return found;
end;
$$;

-- Grup bilgisi güncelle
create or replace function public.update_group_conversation(
  p_conversation_id uuid,
  p_title text default null,
  p_avatar_url text default null
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
    avatar_url = coalesce(p_avatar_url, avatar_url),
    updated_at = now()
  where id = p_conversation_id and type = 'group';

  return found;
end;
$$;

-- Sohbet listesine üye sayısı ekle (dönüş tipi değiştiği için önce drop gerekli)
drop function if exists public.get_user_conversations();

create function public.get_user_conversations()
returns table (
  conversation_id uuid,
  conversation_type public.conversation_type,
  title text,
  avatar_url text,
  last_message_at timestamptz,
  last_message_preview text,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  unread_count bigint,
  member_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id as conversation_id,
    c.type as conversation_type,
    c.title,
    c.avatar_url,
    c.last_message_at,
    c.last_message_preview,
    other_p.id as other_user_id,
    other_p.username as other_username,
    other_p.full_name as other_full_name,
    other_p.avatar_url as other_avatar_url,
    (
      select count(*)
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.deleted_for_all = false
        and m.created_at > coalesce(my_cm.last_read_at, '1970-01-01'::timestamptz)
        and not exists (
          select 1 from public.message_deletions md
          where md.message_id = m.id and md.user_id = auth.uid()
        )
    ) as unread_count,
    (
      select count(*)::bigint
      from public.conversation_members cm_all
      where cm_all.conversation_id = c.id
    ) as member_count
  from public.conversations c
  join public.conversation_members my_cm
    on my_cm.conversation_id = c.id and my_cm.user_id = auth.uid()
  left join lateral (
    select p.id, p.username, p.full_name, p.avatar_url
    from public.conversation_members ocm
    join public.profiles p on p.id = ocm.user_id
    where ocm.conversation_id = c.id
      and ocm.user_id <> auth.uid()
      and c.type = 'direct'
    limit 1
  ) other_p on true
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
