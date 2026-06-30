-- Tam engel: mesaj, arama, sohbet listesi ve yorum koruması

create or replace function public.assert_direct_communication_allowed(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_id = p_to
      and ub.blocked_id = p_from
      and ub.is_restricted = false
  ) then
    raise exception
      'Bu kullanıcı sizi engelledi. Lütfen rahatsız etmeyin. Tekrarlayan rahatsızlık durumunda platform derhal inceleme başlatır.';
  end if;

  if exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_id = p_from
      and ub.blocked_id = p_to
      and ub.is_restricted = false
  ) then
    raise exception
      'Bu kullanıcıyı engellediniz. Engel kaldırılana kadar iletişim kurulamaz.';
  end if;
end;
$$;

create or replace function public.prevent_blocked_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other_id uuid;
  v_type public.conversation_type;
begin
  select c.type into v_type
  from public.conversations c
  where c.id = new.conversation_id;

  if v_type <> 'direct' then
    return new;
  end if;

  select cm.user_id into v_other_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
  limit 1;

  if v_other_id is not null then
    perform public.assert_direct_communication_allowed(new.sender_id, v_other_id);
  end if;

  return new;
end;
$$;

drop trigger if exists messages_block_check on public.messages;
create trigger messages_block_check
  before insert on public.messages
  for each row execute function public.prevent_blocked_message();

create or replace function public.prevent_blocked_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  select p.author_id into v_author_id
  from public.posts p
  where p.id = new.post_id;

  if v_author_id is not null then
    perform public.assert_direct_communication_allowed(new.author_id, v_author_id);
  end if;

  return new;
end;
$$;

drop trigger if exists post_comments_block_check on public.post_comments;
create trigger post_comments_block_check
  before insert on public.post_comments
  for each row execute function public.prevent_blocked_comment();

create or replace function public.prevent_blocked_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_user_blocked(new.caller_id, new.callee_id) then
    raise exception
      'Bu kullanıcı sizi engelledi. Lütfen rahatsız etmeyin. Tekrarlayan rahatsızlık durumunda platform derhal inceleme başlatır.';
  end if;
  return new;
end;
$$;

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if p_other_user_id = v_user_id then
    raise exception 'Kendinizle sohbet başlatamazsınız';
  end if;

  perform public.assert_direct_communication_allowed(v_user_id, p_other_user_id);

  select c.id into v_conversation_id
  from public.conversations c
  where c.type = 'direct'
    and (select count(*) from public.conversation_members cm where cm.conversation_id = c.id) = 2
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = v_user_id
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_other_user_id
    )
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  if not public.can_user_message_me(p_other_user_id, v_user_id) then
    raise exception 'Bu kullanıcı mesaj almıyor';
  end if;

  insert into public.conversations (type, created_by)
  values ('direct', v_user_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_user_id),
    (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_content text default '',
  p_message_type public.message_type default 'text',
  p_media_url text default null,
  p_reply_to_id uuid default null,
  p_forwarded_from_id uuid default null,
  p_metadata jsonb default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  media_url text,
  message_type public.message_type,
  metadata jsonb,
  reply_to_id uuid,
  forwarded_from_id uuid,
  edited_at timestamptz,
  deleted_for_all boolean,
  is_read boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.messages%rowtype;
  v_other_id uuid;
  v_type public.conversation_type;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_user_id
  ) then
    raise exception 'Bu sohbete mesaj gönderemezsiniz';
  end if;

  select c.type into v_type
  from public.conversations c
  where c.id = p_conversation_id;

  if v_type = 'direct' then
    select cm.user_id into v_other_id
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> v_user_id
    limit 1;

    if v_other_id is not null then
      perform public.assert_direct_communication_allowed(v_user_id, v_other_id);
    end if;
  end if;

  if p_reply_to_id is not null and not exists (
    select 1
    from public.messages m
    where m.id = p_reply_to_id
      and m.conversation_id = p_conversation_id
  ) then
    p_reply_to_id := null;
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    media_url,
    message_type,
    reply_to_id,
    forwarded_from_id,
    metadata
  )
  values (
    p_conversation_id,
    v_user_id,
    coalesce(p_content, ''),
    p_media_url,
    p_message_type,
    p_reply_to_id,
    p_forwarded_from_id,
    p_metadata
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.conversation_id,
    v_row.sender_id,
    v_row.content,
    v_row.media_url,
    v_row.message_type,
    v_row.metadata,
    v_row.reply_to_id,
    v_row.forwarded_from_id,
    v_row.edited_at,
    v_row.deleted_for_all,
    v_row.is_read,
    v_row.created_at;
end;
$$;

create or replace function public.get_user_conversations(p_archived_only boolean default false)
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
  member_count bigint,
  is_pinned boolean,
  is_archived boolean,
  muted_until timestamptz,
  is_muted boolean
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
    ) as member_count,
    my_cm.is_pinned,
    my_cm.is_archived,
    my_cm.muted_until,
    (my_cm.muted_until is not null and my_cm.muted_until > now()) as is_muted
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
  where my_cm.is_archived = p_archived_only
    and (
      my_cm.hidden_at is null
      or coalesce(c.last_message_at, c.created_at) > my_cm.hidden_at
    )
    and not (
      c.type = 'direct'
      and other_p.id is not null
      and public.is_user_blocked(auth.uid(), other_p.id)
    )
  order by
    my_cm.is_pinned desc,
    my_cm.pinned_at desc nulls last,
    coalesce(c.last_message_at, c.created_at) desc;
$$;

create or replace function public.get_conversation_detail(p_conversation_id uuid)
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
    select p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.last_seen_at
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
