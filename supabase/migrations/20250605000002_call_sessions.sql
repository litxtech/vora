create type public.call_type as enum ('audio', 'video');
create type public.call_status as enum (
  'ringing',
  'accepted',
  'declined',
  'ended',
  'missed',
  'cancelled'
);

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  channel_name text unique not null,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  call_type public.call_type not null default 'audio',
  status public.call_status not null default 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index call_sessions_callee_status_idx
  on public.call_sessions (callee_id, status)
  where status = 'ringing';

create index call_sessions_caller_idx on public.call_sessions (caller_id, created_at desc);

alter table public.call_sessions enable row level security;

create policy "call_sessions_participant_read" on public.call_sessions
  for select using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "call_sessions_caller_insert" on public.call_sessions
  for insert with check (auth.uid() = caller_id);

create policy "call_sessions_participant_update" on public.call_sessions
  for update using (auth.uid() = caller_id or auth.uid() = callee_id);

alter publication supabase_realtime add table public.call_sessions;
