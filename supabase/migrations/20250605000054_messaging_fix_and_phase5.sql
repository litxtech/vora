-- Düzeltme: get_user_conversations imza değişikliği + Faz 5 (tepkiler, iletme)

drop function if exists public.get_user_conversations();
drop function if exists public.get_user_conversations(boolean);

-- Güncel sohbet listesi
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
  order by
    my_cm.is_pinned desc,
    my_cm.pinned_at desc nulls last,
    coalesce(c.last_message_at, c.created_at) desc;
$$;

-- Grup fonksiyonları (52 başarısız olduysa yeniden oluştur)
create or replace function public.get_my_conversation_role(p_conversation_id uuid)
returns public.conversation_member_role
language sql security definer set search_path = public stable
as $$
  select role from public.conversation_members
  where conversation_id = p_conversation_id and user_id = auth.uid();
$$;

-- Mesaj tepkileri
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions_member_read" on public.message_reactions;
create policy "message_reactions_member_read" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "message_reactions_self_write" on public.message_reactions;
create policy "message_reactions_self_write" on public.message_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- İletme
alter table public.messages
  add column if not exists forwarded_from_id uuid references public.messages (id) on delete set null;

-- Kullanıcı arama (mesajlaşma)
create or replace function public.search_messaging_users(p_query text, p_limit int default 20)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified
  from public.profiles p
  where p.id <> auth.uid()
    and length(trim(coalesce(p_query, ''))) >= 2
    and (
      p.username ilike '%' || trim(p_query) || '%'
      or p.full_name ilike '%' || trim(p_query) || '%'
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by
    case when p.username ilike trim(p_query) || '%' then 0 else 1 end,
    p.username
  limit greatest(p_limit, 1);
$$;

-- Tepki ekle/kaldır
create or replace function public.toggle_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if not exists (
    select 1 from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = p_message_id and cm.user_id = auth.uid()
  ) then
    raise exception 'Mesaja erişiminiz yok';
  end if;

  select exists (
    select 1 from public.message_reactions
    where message_id = p_message_id and user_id = auth.uid() and emoji = p_emoji
  ) into v_exists;

  if v_exists then
    delete from public.message_reactions
    where message_id = p_message_id and user_id = auth.uid() and emoji = p_emoji;
    return false;
  end if;

  delete from public.message_reactions
  where message_id = p_message_id and user_id = auth.uid();

  insert into public.message_reactions (message_id, user_id, emoji)
  values (p_message_id, auth.uid(), p_emoji);

  return true;
end;
$$;

alter publication supabase_realtime add table public.message_reactions;
