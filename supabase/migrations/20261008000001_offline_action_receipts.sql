-- Çevrimdışı işlem kuyruğu için tek seferlik uygulama kaydı.
-- Aynı istemci kimliği ikinci kez yorum veya gönderi üretmesin.

create table if not exists public.offline_action_receipts (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null,
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  constraint offline_action_receipts_id_len check (char_length(id) between 8 and 120),
  constraint offline_action_receipts_status check (status in ('pending', 'done', 'failed'))
);

create index if not exists offline_action_receipts_user_idx
  on public.offline_action_receipts (user_id, created_at desc);

alter table public.offline_action_receipts enable row level security;

create policy "offline_receipts_own_select"
  on public.offline_action_receipts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "offline_receipts_own_insert"
  on public.offline_action_receipts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "offline_receipts_own_update"
  on public.offline_action_receipts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "offline_receipts_own_delete"
  on public.offline_action_receipts
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.offline_action_receipts to authenticated;
