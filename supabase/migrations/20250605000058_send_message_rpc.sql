-- Güvenilir mesaj gönderimi ve mesaj listesi iyileştirmesi

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

drop function if exists public.get_conversation_messages(uuid, int, timestamptz);

create or replace function public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit int default 50,
  p_before timestamptz default null
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
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.media_url,
    m.message_type,
    m.metadata,
    m.reply_to_id,
    m.forwarded_from_id,
    m.edited_at,
    m.deleted_for_all,
    m.is_read,
    m.created_at
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.deleted_for_all = false
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = p_conversation_id
        and cm.user_id = auth.uid()
    )
    and not exists (
      select 1
      from public.message_deletions md
      where md.message_id = m.id
        and md.user_id = auth.uid()
    )
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.send_message(
  uuid, text, public.message_type, text, uuid, uuid, jsonb
) to authenticated;
grant execute on function public.get_conversation_messages(uuid, int, timestamptz) to authenticated;
