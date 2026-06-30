-- Bölüm 57 Faz 1: Mesajlaşma temel düzeltmeleri
-- Kişi başına silme, last_read_at tabanlı okunmadı sayısı, inbox realtime

-- Kullanıcı bazlı "benden sil" kayıtları
create table if not exists public.message_deletions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_deletions_user_idx
  on public.message_deletions (user_id, deleted_at desc);

alter table public.message_deletions enable row level security;

drop policy if exists "message_deletions_self_read" on public.message_deletions;
create policy "message_deletions_self_read" on public.message_deletions
  for select using (auth.uid() = user_id);

drop policy if exists "message_deletions_self_insert" on public.message_deletions;
create policy "message_deletions_self_insert" on public.message_deletions
  for insert with check (auth.uid() = user_id);

drop policy if exists "message_deletions_self_delete" on public.message_deletions;
create policy "message_deletions_self_delete" on public.message_deletions
  for delete using (auth.uid() = user_id);

-- Inbox realtime: konuşma önizlemesi ve okundu durumu
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.profiles;

-- Okunmadı sayısı: last_read_at tabanlı (grup uyumlu)
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
        and m.deleted_for_all = false
        and m.created_at > coalesce(my_cm.last_read_at, '1970-01-01'::timestamptz)
        and not exists (
          select 1 from public.message_deletions md
          where md.message_id = m.id and md.user_id = auth.uid()
        )
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

-- Sohbet mesajlarını getir (kullanıcı bazlı silinenleri hariç tut)
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
  reply_to_id uuid,
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
    m.reply_to_id,
    m.edited_at,
    m.deleted_for_all,
    m.is_read,
    m.created_at
  from public.messages m
  where m.conversation_id = p_conversation_id
    and not exists (
      select 1 from public.message_deletions md
      where md.message_id = m.id and md.user_id = auth.uid()
    )
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit greatest(p_limit, 1);
$$;
