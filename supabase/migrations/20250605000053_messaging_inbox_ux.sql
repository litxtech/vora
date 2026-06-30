-- Bölüm 57 Faz 4: Sabitleme, arşiv, sessize alma, sohbet silme

alter table public.conversation_members
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists is_archived boolean not null default false,
  add column if not exists muted_until timestamptz,
  add column if not exists hidden_at timestamptz;

create index if not exists conversation_members_pinned_idx
  on public.conversation_members (user_id, is_pinned desc, pinned_at desc nulls last);

-- Yeni mesaj gelince gizlenmiş sohbeti geri aç (Telegram mantığı)
create or replace function public.unhide_conversation_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set hidden_at = null
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id
    and hidden_at is not null;
  return new;
end;
$$;

drop trigger if exists messages_unhide_recipients on public.messages;
create trigger messages_unhide_recipients
  after insert on public.messages
  for each row execute function public.unhide_conversation_on_new_message();

-- Sessize alınmış üyelere bildirim gitmesin
create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  preview text;
  v_conv_type public.conversation_type;
  v_conv_title text;
  v_event public.notification_event_type;
begin
  select coalesce(p.full_name, '@' || p.username)
  into sender_name
  from public.profiles p
  where p.id = new.sender_id;

  select c.type, c.title
  into v_conv_type, v_conv_title
  from public.conversations c
  where c.id = new.conversation_id;

  preview := left(
    case new.message_type
      when 'image' then 'Fotoğraf gönderdi'
      when 'video' then 'Video gönderdi'
      when 'audio' then 'Ses kaydı gönderdi'
      when 'location' then 'Konum paylaştı'
      when 'file' then 'Dosya gönderdi'
      else new.content
    end,
    180
  );

  v_event := case when v_conv_type = 'group' then 'group_message'::public.notification_event_type
                  else 'message'::public.notification_event_type end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview else preview end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'is_group', v_conv_type = 'group'),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview else preview end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'is_group', v_conv_type = 'group'),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;

-- Sohbet listesi (arşiv / sabit / sessiz destekli)
drop function if exists public.get_user_conversations();
drop function if exists public.get_user_conversations(boolean);

create function public.get_user_conversations(p_archived_only boolean default false)
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
  order by
    my_cm.is_pinned desc,
    my_cm.pinned_at desc nulls last,
    coalesce(c.last_message_at, c.created_at) desc;
$$;

-- Sabitle (max 10)
create or replace function public.pin_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.conversation_members
  where user_id = auth.uid() and is_pinned = true;

  if v_count >= 10 then
    raise exception 'En fazla 10 sohbet sabitlenebilir';
  end if;

  update public.conversation_members
  set is_pinned = true, pinned_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.unpin_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set is_pinned = false, pinned_at = null
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.archive_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set is_archived = true, is_pinned = false, pinned_at = null
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.unarchive_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set is_archived = false
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

-- p_duration_minutes: null = sonsuz sessiz
create or replace function public.mute_conversation(
  p_conversation_id uuid,
  p_duration_minutes integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set muted_until = case
    when p_duration_minutes is null then '2099-12-31 23:59:59+00'::timestamptz
    else now() + (p_duration_minutes || ' minutes')::interval
  end
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.unmute_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set muted_until = null
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

-- Sohbet geçmişini temizle (benden sil)
create or replace function public.clear_conversation_history(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cleared integer;
begin
  insert into public.message_deletions (message_id, user_id)
  select m.id, auth.uid()
  from public.messages m
  where m.conversation_id = p_conversation_id
    and not exists (
      select 1 from public.message_deletions md
      where md.message_id = m.id and md.user_id = auth.uid()
    );

  get diagnostics v_cleared = row_count;

  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return v_cleared;
end;
$$;

-- Sohbeti tekrar göster (profilden açma vb.)
create or replace function public.show_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set hidden_at = null
  where conversation_id = p_conversation_id and user_id = auth.uid();
  return found;
end;
$$;

-- Sohbeti tamamen sil (listeden kaldır + geçmişi temizle)
create or replace function public.delete_conversation_for_user(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.clear_conversation_history(p_conversation_id);

  update public.conversation_members
  set
    hidden_at = now(),
    is_pinned = false,
    pinned_at = null,
    is_archived = false
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return found;
end;
$$;
