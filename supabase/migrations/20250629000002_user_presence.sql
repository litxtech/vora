-- Presence heartbeat: profiles tablosu yerine hafif ayrı tablo (realtime fan-out azaltır)

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz,
  last_active_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_online_idx
  on public.user_presence (is_online, last_active_at desc nulls last);

alter table public.user_presence enable row level security;

drop policy if exists user_presence_select_authenticated on public.user_presence;
create policy user_presence_select_authenticated on public.user_presence
  for select to authenticated using (true);

drop policy if exists user_presence_own_write on public.user_presence;
create policy user_presence_own_write on public.user_presence
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Mevcut çevrimiçi kullanıcıları taşı
insert into public.user_presence (user_id, is_online, last_seen_at, last_active_at, updated_at)
select
  p.id,
  coalesce(p.is_online, false),
  p.last_seen_at,
  p.last_active_at,
  now()
from public.profiles p
on conflict (user_id) do nothing;
