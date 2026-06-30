-- Mesajlaşma modülü: RLS, RPC, bildirimler ve genişletilmiş şema

do $$ begin
  create type public.message_type as enum ('text', 'image', 'video', 'audio', 'location', 'file');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.conversation_member_role as enum ('member', 'moderator', 'admin', 'founder');
exception
  when duplicate_object then null;
end $$;

-- Konuşma önizleme alanları
alter table public.conversations
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_preview text,
  add column if not exists avatar_url text;

-- Üye okuma durumu ve grup rolleri
alter table public.conversation_members
  add column if not exists last_read_at timestamptz,
  add column if not exists role public.conversation_member_role not null default 'member';

-- Mesaj genişletmeleri
alter table public.messages
  add column if not exists message_type public.message_type not null default 'text',
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_for_all boolean not null default false;

create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc nulls last);

-- RLS: konuşmalar
drop policy if exists "conversations_member_read" on public.conversations;
create policy "conversations_member_read" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "conversations_member_insert" on public.conversations;
create policy "conversations_member_insert" on public.conversations
  for insert with check (auth.uid() = created_by);

drop policy if exists "conversations_member_update" on public.conversations;
create policy "conversations_member_update" on public.conversations
  for update using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

-- RLS: üyeler
drop policy if exists "conversation_members_self_read" on public.conversation_members;
create policy "conversation_members_self_read" on public.conversation_members
  for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_members_creator_insert" on public.conversation_members;
create policy "conversation_members_creator_insert" on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
        and cm.role in ('admin', 'founder', 'moderator')
    )
  );

drop policy if exists "conversation_members_self_update" on public.conversation_members;
create policy "conversation_members_self_update" on public.conversation_members
  for update using (auth.uid() = user_id);

-- Mesaj güncelleme (okundu, düzenleme, silme)
drop policy if exists "messages_member_update" on public.messages;
create policy "messages_member_update" on public.messages
  for update using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- Son mesaj önizlemesini güncelle
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_for_all then
    update public.conversations
    set
      last_message_at = new.created_at,
      last_message_preview = 'Mesaj silindi',
      updated_at = now()
    where id = new.conversation_id;
  else
    update public.conversations
    set
      last_message_at = new.created_at,
      last_message_preview = left(
        case new.message_type
          when 'image' then '📷 Fotoğraf'
          when 'video' then '🎬 Video'
          when 'audio' then '🎤 Ses kaydı'
          when 'location' then '📍 Konum'
          when 'file' then '📎 Dosya'
          else new.content
        end,
        120
      ),
      updated_at = now()
    where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_update_conversation_preview on public.messages;
create trigger messages_update_conversation_preview
  after insert on public.messages
  for each row execute function public.update_conversation_last_message();

-- Yeni mesaj bildirimi
create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  preview text;
begin
  select coalesce(p.full_name, '@' || p.username)
  into sender_name
  from public.profiles p
  where p.id = new.sender_id;

  preview := left(
    case new.message_type
      when 'image' then 'Fotoğraf gönderdi'
      when 'video' then 'Video gönderdi'
      when 'audio' then 'Ses kaydı gönderdi'
      when 'location' then 'Konum paylaştı'
      else new.content
    end,
    180
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    'message'::public.notification_event_type,
    coalesce(sender_name, 'Yeni mesaj'),
    preview,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    'message'::public.notification_event_type,
    coalesce(sender_name, 'Yeni mesaj'),
    preview,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists messages_notify_recipients on public.messages;
create trigger messages_notify_recipients
  after insert on public.messages
  for each row execute function public.notify_message_recipients();

-- Tekli sohbet oluştur veya mevcut olanı döndür
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

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_user_id and blocked_id = p_other_user_id)
       or (blocker_id = p_other_user_id and blocked_id = v_user_id)
  ) then
    raise exception 'Bu kullanıcıyla mesajlaşamazsınız';
  end if;

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

  insert into public.conversations (type, created_by)
  values ('direct', v_user_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (v_conversation_id, v_user_id, 'member'),
    (v_conversation_id, p_other_user_id, 'member');

  return v_conversation_id;
end;
$$;

-- Kullanıcının sohbet listesi
create or replace function public.get_user_conversations()
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
  unread_count bigint
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
        and m.is_read = false
        and m.deleted_for_all = false
    ) as unread_count
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

-- Mesaj medya storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp4']
)
on conflict (id) do nothing;

drop policy if exists "Mesaj medyası herkese açık" on storage.objects;
create policy "Mesaj medyası herkese açık"
on storage.objects for select
using (bucket_id = 'message-media');

drop policy if exists "Üye mesaj medyası yükleyebilir" on storage.objects;
create policy "Üye mesaj medyası yükleyebilir"
on storage.objects for insert
to authenticated
with check (bucket_id = 'message-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Üye kendi mesaj medyasını silebilir" on storage.objects;
create policy "Üye kendi mesaj medyasını silebilir"
on storage.objects for delete
to authenticated
using (bucket_id = 'message-media' and auth.uid()::text = (storage.foldername(name))[1]);
