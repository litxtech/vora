-- Inbox realtime: kullanıcıya filtreli olay tablosu (tüm messages INSERT dinlemesi yerine)

create table if not exists public.message_inbox_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  message_type text not null default 'text',
  media_url text,
  reply_to_id uuid references public.messages (id) on delete set null,
  forwarded_from_id uuid references public.messages (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null,
  deleted_for_all boolean not null default false,
  constraint message_inbox_events_user_message_unique unique (user_id, message_id)
);

create index if not exists message_inbox_events_user_created_idx
  on public.message_inbox_events (user_id, created_at desc);

alter table public.message_inbox_events enable row level security;

drop policy if exists message_inbox_events_recipient_read on public.message_inbox_events;
create policy message_inbox_events_recipient_read on public.message_inbox_events
  for select using (user_id = auth.uid());

create or replace function public.fanout_message_inbox_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_inbox_events (
    user_id,
    message_id,
    conversation_id,
    sender_id,
    content,
    message_type,
    media_url,
    reply_to_id,
    forwarded_from_id,
    metadata,
    created_at,
    deleted_for_all
  )
  select
    cm.user_id,
    new.id,
    new.conversation_id,
    new.sender_id,
    new.content,
    coalesce(new.message_type::text, 'text'),
    new.media_url,
    new.reply_to_id,
    new.forwarded_from_id,
    new.metadata,
    new.created_at,
    coalesce(new.deleted_for_all, false)
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
  on conflict (user_id, message_id) do nothing;

  return new;
end;
$$;

drop trigger if exists messages_inbox_fanout on public.messages;
create trigger messages_inbox_fanout
  after insert on public.messages
  for each row
  execute function public.fanout_message_inbox_event();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_inbox_events'
  ) then
    alter publication supabase_realtime add table public.message_inbox_events;
  end if;
end;
$$;
