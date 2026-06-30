-- conversation_members ↔ messages/conversations RLS döngüsünü kır (security definer yardımcılar)
-- Hata: 42P17 infinite recursion detected in policy for relation "conversation_members"

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.has_conversation_manage_role(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
      and cm.role in ('admin', 'founder', 'moderator')
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated, anon;
grant execute on function public.has_conversation_manage_role(uuid) to authenticated, anon;

-- conversation_members
drop policy if exists "conversation_members_self_read" on public.conversation_members;
create policy "conversation_members_self_read" on public.conversation_members
  for select using (
    public.is_conversation_member(conversation_id)
  );

drop policy if exists "conversation_members_creator_insert" on public.conversation_members;
create policy "conversation_members_creator_insert" on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
    or public.has_conversation_manage_role(conversation_members.conversation_id)
  );

-- conversations
drop policy if exists "conversations_member_read" on public.conversations;
create policy "conversations_member_read" on public.conversations
  for select using (
    public.is_conversation_member(id)
  );

drop policy if exists "conversations_member_update" on public.conversations;
create policy "conversations_member_update" on public.conversations
  for update using (
    public.is_conversation_member(id)
  );

-- messages
drop policy if exists "messages_member_read" on public.messages;
create policy "messages_member_read" on public.messages
  for select using (
    public.is_conversation_member(conversation_id)
  );

drop policy if exists "messages_member_insert" on public.messages;
create policy "messages_member_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "messages_member_update" on public.messages;
create policy "messages_member_update" on public.messages
  for update using (
    public.is_conversation_member(conversation_id)
  );

-- message_reactions
drop policy if exists "message_reactions_member_read" on public.message_reactions;
create policy "message_reactions_member_read" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );
