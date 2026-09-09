-- Vora City Governance — Phase 2: seçim tabloları, adaylık, oy

create type public.city_election_type as enum ('leader', 'council');
create type public.city_election_status as enum (
  'scheduled',
  'nomination',
  'voting',
  'counting',
  'completed',
  'cancelled'
);
create type public.city_election_candidate_type as enum ('leader', 'council');
create type public.city_election_candidate_status as enum (
  'pending',
  'approved',
  'rejected',
  'withdrawn'
);

create table if not exists public.city_elections (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  election_type public.city_election_type not null default 'leader',
  title text not null,
  description text,
  starts_at timestamptz not null default now(),
  nomination_ends_at timestamptz not null,
  voting_starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.city_election_status not null default 'nomination',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists city_elections_region_status_idx
  on public.city_elections (region_id, status, ends_at desc);

create table if not exists public.city_election_candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.city_elections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_type public.city_election_candidate_type not null default 'leader',
  statement text,
  status public.city_election_candidate_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, user_id)
);

create index if not exists city_election_candidates_election_idx
  on public.city_election_candidates (election_id, status, created_at);

create table if not exists public.city_election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.city_elections (id) on delete cascade,
  voter_user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (election_id, voter_user_id)
);

create index if not exists city_election_votes_candidate_idx
  on public.city_election_votes (election_id, candidate_user_id);

create trigger city_elections_updated_at
  before update on public.city_elections
  for each row execute function public.set_updated_at();

create trigger city_election_candidates_updated_at
  before update on public.city_election_candidates
  for each row execute function public.set_updated_at();

create or replace function public._city_governance_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.app_system_config where key = 'city_governance'),
    '{}'::jsonb
  );
$$;

create or replace function public._city_election_eligible(
  p_user_id uuid,
  p_region_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_config jsonb := public._city_governance_config();
  v_min_account_days integer := coalesce((v_config ->> 'election_min_account_age_days')::integer, 7);
  v_min_membership_days integer := coalesce((v_config ->> 'election_min_membership_days')::integer, 3);
  v_profile public.profiles%rowtype;
  v_membership public.city_memberships%rowtype;
begin
  if p_user_id is null then
    return false;
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if not found or coalesce(v_profile.account_status, 'active') <> 'active' then
    return false;
  end if;

  if v_profile.created_at > now() - make_interval(days => v_min_account_days) then
    return false;
  end if;

  select * into v_membership
  from public.city_memberships
  where user_id = p_user_id and region_id = p_region_id;

  if not found or v_membership.status <> 'active' then
    return false;
  end if;

  if v_membership.joined_at > now() - make_interval(days => v_min_membership_days) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.refresh_city_election_status(p_election_id uuid)
returns public.city_elections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.city_elections%rowtype;
begin
  select * into v_election from public.city_elections where id = p_election_id for update;
  if not found then
    raise exception 'election not found';
  end if;

  if v_election.status in ('completed', 'cancelled', 'scheduled') then
    return v_election;
  end if;

  if v_election.status = 'nomination' and now() >= v_election.nomination_ends_at then
    update public.city_elections
    set status = 'voting', updated_at = now()
    where id = p_election_id
    returning * into v_election;
  end if;

  if v_election.status = 'voting' and now() >= v_election.ends_at then
    update public.city_elections
    set status = 'counting', updated_at = now()
    where id = p_election_id
    returning * into v_election;
  end if;

  return v_election;
end;
$$;

create or replace function public.apply_city_election_candidacy(
  p_election_id uuid,
  p_statement text default null
)
returns public.city_election_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_election public.city_elections%rowtype;
  v_candidate public.city_election_candidates;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_election := public.refresh_city_election_status(p_election_id);

  if v_election.status <> 'nomination' then
    raise exception 'nomination is not open';
  end if;

  if not public._city_election_eligible(v_user_id, v_election.region_id) then
    raise exception 'not eligible for election';
  end if;

  insert into public.city_election_candidates (
    election_id,
    user_id,
    candidate_type,
    statement,
    status
  )
  values (
    p_election_id,
    v_user_id,
    case v_election.election_type when 'leader' then 'leader'::public.city_election_candidate_type else 'council'::public.city_election_candidate_type end,
    nullif(btrim(p_statement), ''),
    'approved'
  )
  on conflict (election_id, user_id) do update
    set
      statement = coalesce(excluded.statement, public.city_election_candidates.statement),
      status = case
        when public.city_election_candidates.status = 'withdrawn' then 'approved'::public.city_election_candidate_status
        else public.city_election_candidates.status
      end,
      updated_at = now()
  returning * into v_candidate;

  return v_candidate;
end;
$$;

create or replace function public.withdraw_city_election_candidacy(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.city_election_candidates
  set status = 'withdrawn', updated_at = now()
  where election_id = p_election_id and user_id = v_user_id;
end;
$$;

create or replace function public.cast_city_election_vote(
  p_election_id uuid,
  p_candidate_user_id uuid
)
returns public.city_election_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_election public.city_elections%rowtype;
  v_vote public.city_election_votes;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_election := public.refresh_city_election_status(p_election_id);

  if v_election.status <> 'voting' then
    raise exception 'voting is not open';
  end if;

  if not public._city_election_eligible(v_user_id, v_election.region_id) then
    raise exception 'not eligible to vote';
  end if;

  if not exists (
    select 1
    from public.city_election_candidates c
    where c.election_id = p_election_id
      and c.user_id = p_candidate_user_id
      and c.status = 'approved'
  ) then
    raise exception 'invalid candidate';
  end if;

  insert into public.city_election_votes (election_id, voter_user_id, candidate_user_id)
  values (p_election_id, v_user_id, p_candidate_user_id)
  returning * into v_vote;

  return v_vote;
exception
  when unique_violation then
    raise exception 'already voted in this election';
end;
$$;

alter table public.city_elections enable row level security;
alter table public.city_election_candidates enable row level security;
alter table public.city_election_votes enable row level security;

create policy city_elections_select_authenticated
  on public.city_elections for select to authenticated using (true);

create policy city_elections_admin_write
  on public.city_elections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy city_election_candidates_select_authenticated
  on public.city_election_candidates for select to authenticated using (true);

create policy city_election_candidates_admin_write
  on public.city_election_candidates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy city_election_votes_select_own
  on public.city_election_votes for select to authenticated
  using (auth.uid() = voter_user_id or public.is_admin());

create policy city_election_votes_admin_write
  on public.city_election_votes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant execute on function public.apply_city_election_candidacy(uuid, text) to authenticated;
grant execute on function public.withdraw_city_election_candidacy(uuid) to authenticated;
grant execute on function public.cast_city_election_vote(uuid, uuid) to authenticated;
grant execute on function public.refresh_city_election_status(uuid) to authenticated;
grant execute on function public._city_election_eligible(uuid, text) to authenticated;

alter publication supabase_realtime add table public.city_elections;
