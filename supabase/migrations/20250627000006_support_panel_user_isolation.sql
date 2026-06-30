-- Destek panelleri: kullanıcı yalnızca kendi thread/talep/mesajlarını görebilsin (RLS güçlendirme)

alter table public.live_support_threads enable row level security;
alter table public.live_support_threads force row level security;
alter table public.live_support_messages enable row level security;
alter table public.live_support_messages force row level security;

alter table public.premium_support_threads enable row level security;
alter table public.premium_support_threads force row level security;
alter table public.premium_support_messages enable row level security;
alter table public.premium_support_messages force row level security;

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;

drop policy if exists live_support_threads_user_select on public.live_support_threads;
create policy live_support_threads_user_select on public.live_support_threads
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

drop policy if exists live_support_messages_user_select on public.live_support_messages;
create policy live_support_messages_user_select on public.live_support_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.live_support_threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists premium_support_threads_user_select on public.premium_support_threads;
create policy premium_support_threads_user_select on public.premium_support_threads
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

drop policy if exists premium_support_messages_user_select on public.premium_support_messages;
create policy premium_support_messages_user_select on public.premium_support_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.premium_support_threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists support_tickets_user_select on public.support_tickets;
create policy support_tickets_user_select on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

drop policy if exists support_tickets_user_insert on public.support_tickets;
create policy support_tickets_user_insert on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());
