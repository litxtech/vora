-- Kaşif modu: kullanıcıların haritada anlık konum paylaşımı

create table if not exists public.explorer_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  heading double precision,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists explorer_presence_region_visible_idx
  on public.explorer_presence (region_id, is_visible, updated_at desc);

alter table public.explorer_presence enable row level security;

create policy "explorer_presence_read"
  on public.explorer_presence
  for select
  to authenticated
  using (
    is_visible = true
    and updated_at > now() - interval '5 minutes'
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = explorer_presence.user_id)
         or (ub.blocker_id = explorer_presence.user_id and ub.blocked_id = auth.uid())
    )
  );

create policy "explorer_presence_self_write"
  on public.explorer_presence
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── RPC: konum güncelle ─────────────────────────────────────────────────────

create or replace function public.upsert_explorer_presence(
  p_region_id text,
  p_latitude double precision,
  p_longitude double precision,
  p_heading double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  insert into public.explorer_presence (
    user_id, region_id, latitude, longitude, heading, is_visible, updated_at
  )
  values (
    auth.uid(), p_region_id, p_latitude, p_longitude, p_heading, true, now()
  )
  on conflict (user_id) do update set
    region_id = excluded.region_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    heading = excluded.heading,
    is_visible = true,
    updated_at = now();
end;
$$;

-- ─── RPC: kaşif modundan çık ─────────────────────────────────────────────────

create or replace function public.clear_explorer_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.explorer_presence where user_id = auth.uid();
end;
$$;

-- ─── RPC: bölgedeki görünür kaşifler ─────────────────────────────────────────

create or replace function public.list_explorers(p_region_id text)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  latitude double precision,
  longitude double precision,
  heading double precision,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ep.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified,
    ep.latitude,
    ep.longitude,
    ep.heading,
    ep.updated_at
  from public.explorer_presence ep
  inner join public.profiles p on p.id = ep.user_id
  where ep.region_id = p_region_id
    and ep.is_visible = true
    and ep.updated_at > now() - interval '3 minutes'
    and p.account_status = 'active'
    and ep.user_id is distinct from auth.uid()
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = ep.user_id)
         or (ub.blocker_id = ep.user_id and ub.blocked_id = auth.uid())
    );
$$;

grant execute on function public.upsert_explorer_presence(text, double precision, double precision, double precision)
  to authenticated;
grant execute on function public.clear_explorer_presence() to authenticated;
grant execute on function public.list_explorers(text) to authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'explorer_presence'
  ) then
    alter publication supabase_realtime add table public.explorer_presence;
  end if;
end $$;
