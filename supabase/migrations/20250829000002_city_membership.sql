-- Vora City Governance — Phase 1: üyelik, RLS, RPC

create type public.city_membership_role as enum (
  'citizen',
  'council_member',
  'deputy',
  'leader'
);

create type public.city_membership_status as enum (
  'active',
  'suspended',
  'left'
);

alter table public.profiles
  add column if not exists primary_city_id text references public.regions (id) on delete set null;

create table if not exists public.city_memberships (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.city_membership_role not null default 'citizen',
  status public.city_membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, user_id)
);

create index if not exists city_memberships_user_idx
  on public.city_memberships (user_id, status, joined_at desc);

create index if not exists city_memberships_region_active_idx
  on public.city_memberships (region_id, status, role)
  where status = 'active';

create index if not exists city_memberships_region_leader_idx
  on public.city_memberships (region_id)
  where status = 'active' and role = 'leader';

create trigger city_memberships_updated_at
  before update on public.city_memberships
  for each row execute function public.set_updated_at();

-- Üye sayacı
create or replace function public.sync_city_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region_id text;
begin
  v_region_id := coalesce(new.region_id, old.region_id);

  update public.regions r
  set member_count = (
    select count(*)::integer
    from public.city_memberships cm
    where cm.region_id = v_region_id
      and cm.status = 'active'
  )
  where r.id = v_region_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists city_memberships_count_sync on public.city_memberships;
create trigger city_memberships_count_sync
  after insert or update of status or delete on public.city_memberships
  for each row execute function public.sync_city_member_count();

-- Role değişikliğini client'tan engelle
create or replace function public.protect_city_membership_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'city membership role cannot be changed directly';
    end if;
  end if;

  if tg_op = 'INSERT' and new.role <> 'citizen' then
    if not public.is_admin() then
      raise exception 'city membership must start as citizen';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists city_memberships_protect_role on public.city_memberships;
create trigger city_memberships_protect_role
  before insert or update on public.city_memberships
  for each row execute function public.protect_city_membership_role();

alter table public.city_memberships enable row level security;

create policy city_memberships_select_authenticated
  on public.city_memberships for select
  to authenticated
  using (true);

create policy city_memberships_admin_write
  on public.city_memberships for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Tek aktif lider kuralı
create or replace function public.enforce_single_city_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.role = 'leader' then
    if exists (
      select 1
      from public.city_memberships cm
      where cm.region_id = new.region_id
        and cm.status = 'active'
        and cm.role = 'leader'
        and cm.user_id is distinct from new.user_id
        and cm.id is distinct from new.id
    ) then
      raise exception 'city already has an active leader';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists city_memberships_single_leader on public.city_memberships;
create trigger city_memberships_single_leader
  before insert or update on public.city_memberships
  for each row execute function public.enforce_single_city_leader();

create or replace function public._city_governance_enabled(p_region_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.regions r
    where r.id = p_region_id
      and r.governance_status = 'active'
      and (
        not exists (
          select 1
          from public.app_system_config c
          where c.key = 'city_governance'
        )
        or p_region_id = any (
          select jsonb_array_elements_text(coalesce(c.value -> 'enabled_region_ids', '[]'::jsonb))
          from public.app_system_config c
          where c.key = 'city_governance'
        )
      )
  );
$$;

create or replace function public.join_city(p_region_id text)
returns public.city_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.city_memberships;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public._city_governance_enabled(p_region_id) then
    raise exception 'city governance not enabled for this region';
  end if;

  select * into v_membership
  from public.city_memberships
  where region_id = p_region_id and user_id = v_user_id;

  if v_membership.id is null then
    insert into public.city_memberships (region_id, user_id, role, status, joined_at)
    values (p_region_id, v_user_id, 'citizen', 'active', now())
    returning * into v_membership;
  elsif v_membership.status = 'suspended' then
    raise exception 'city membership suspended';
  elsif v_membership.status = 'left' then
    update public.city_memberships
    set status = 'active', joined_at = now(), updated_at = now()
    where id = v_membership.id
    returning * into v_membership;
  end if;

  update public.profiles
  set primary_city_id = p_region_id, updated_at = now()
  where id = v_user_id;

  return v_membership;
end;
$$;

create or replace function public.leave_city(p_region_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.city_memberships;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_membership
  from public.city_memberships
  where region_id = p_region_id and user_id = v_user_id;

  if v_membership.id is null or v_membership.status <> 'active' then
    raise exception 'not an active member of this city';
  end if;

  if v_membership.role = 'leader' then
    raise exception 'active city leader cannot leave';
  end if;

  update public.city_memberships
  set status = 'left', updated_at = now()
  where id = v_membership.id;

  update public.profiles
  set
    primary_city_id = case when primary_city_id = p_region_id then null else primary_city_id end,
    updated_at = now()
  where id = v_user_id;
end;
$$;

create or replace function public.admin_assign_city_leader(
  p_region_id text,
  p_user_id uuid
)
returns public.city_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.city_memberships;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if not exists (select 1 from public.regions where id = p_region_id) then
    raise exception 'region not found';
  end if;

  insert into public.city_memberships (region_id, user_id, role, status, joined_at)
  values (p_region_id, p_user_id, 'leader', 'active', now())
  on conflict (region_id, user_id) do update
    set role = 'leader', status = 'active', updated_at = now()
  returning * into v_membership;

  update public.city_memberships
  set role = 'citizen', updated_at = now()
  where region_id = p_region_id
    and status = 'active'
    and role = 'leader'
    and user_id <> p_user_id;

  return v_membership;
end;
$$;

create or replace function public.get_city_active_count(p_region_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.city_memberships cm
  join public.user_presence up on up.user_id = cm.user_id
  where cm.region_id = p_region_id
    and cm.status = 'active'
    and up.is_online = true;
$$;

grant execute on function public.join_city(text) to authenticated;
grant execute on function public.leave_city(text) to authenticated;
grant execute on function public.admin_assign_city_leader(text, uuid) to authenticated;
grant execute on function public.get_city_active_count(text) to authenticated, anon;

alter publication supabase_realtime add table public.city_memberships;
