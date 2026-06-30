-- Mesaj ölçeklenebilirliği: inbox unread sayacı (COUNT(*) yerine)

alter table public.conversation_members
  add column if not exists unread_count integer not null default 0;

update public.conversation_members cm
set unread_count = (
  select count(*)::integer
  from public.messages m
  where m.conversation_id = cm.conversation_id
    and m.sender_id <> cm.user_id
    and m.deleted_for_all = false
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    and not exists (
      select 1
      from public.message_deletions md
      where md.message_id = m.id
        and md.user_id = cm.user_id
    )
);

create or replace function public.bump_conversation_unread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_for_all then
    return new;
  end if;

  update public.conversation_members cm
  set unread_count = cm.unread_count + 1
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists messages_bump_unread on public.messages;
create trigger messages_bump_unread
  after insert on public.messages
  for each row
  execute function public.bump_conversation_unread_on_message();

create or replace function public.reset_conversation_unread_on_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_read_at is distinct from old.last_read_at
     and new.last_read_at is not null
     and (old.last_read_at is null or new.last_read_at >= old.last_read_at) then
    new.unread_count := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_members_reset_unread on public.conversation_members;
create trigger conversation_members_reset_unread
  before update of last_read_at on public.conversation_members
  for each row
  execute function public.reset_conversation_unread_on_read();

create or replace function public.decrement_unread_on_message_hide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members cm
  set unread_count = greatest(0, cm.unread_count - 1)
  from public.messages m
  where m.id = new.message_id
    and cm.conversation_id = m.conversation_id
    and cm.user_id = new.user_id
    and m.sender_id <> cm.user_id
    and m.deleted_for_all = false
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz);

  return new;
end;
$$;

drop trigger if exists message_deletions_decrement_unread on public.message_deletions;
create trigger message_deletions_decrement_unread
  after insert on public.message_deletions
  for each row
  execute function public.decrement_unread_on_message_hide();

create or replace function public.decrement_unread_on_message_deleted_for_all()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (old.deleted_for_all is distinct from new.deleted_for_all and new.deleted_for_all) then
    return new;
  end if;

  update public.conversation_members cm
  set unread_count = greatest(0, cm.unread_count - 1)
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and new.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz);

  return new;
end;
$$;

drop trigger if exists messages_decrement_unread_on_delete_for_all on public.messages;
create trigger messages_decrement_unread_on_delete_for_all
  after update of deleted_for_all on public.messages
  for each row
  execute function public.decrement_unread_on_message_deleted_for_all();

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
    greatest(my_cm.unread_count, 0)::bigint as unread_count,
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

create or replace function public.get_messaging_unread_count(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_user_id is null then
    return 0;
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  return (
    select coalesce(sum(greatest(cm.unread_count, 0)), 0)::bigint
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.user_id = p_user_id
      and cm.is_archived = false
      and (
        cm.hidden_at is null
        or coalesce(c.last_message_at, c.created_at) > cm.hidden_at
      )
  );
end;
$$;

grant execute on function public.get_user_conversations(boolean) to authenticated;
grant execute on function public.get_messaging_unread_count(uuid) to authenticated;
grant execute on function public.get_messaging_unread_count(uuid) to service_role;

notify pgrst, 'reload schema';
