-- Vora City Governance — Phase 5: meclis

create type public.city_proposal_status as enum (
  'collecting_support',
  'qualified',
  'council_review',
  'accepted',
  'rejected',
  'archived'
);

create type public.city_proposal_category as enum (
  'room', 'event', 'diplomacy', 'community', 'rules', 'other'
);

create type public.city_council_session_type as enum ('city', 'joint_city', 'regional');
create type public.city_council_session_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type public.city_council_decision_status as enum ('draft', 'voting', 'approved', 'rejected');
create type public.city_council_vote_choice as enum ('yes', 'no', 'abstain');

create table if not exists public.city_council_proposals (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  category public.city_proposal_category not null default 'other',
  status public.city_proposal_status not null default 'collecting_support',
  support_count integer not null default 0,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.city_proposal_supports (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.city_council_proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (proposal_id, user_id)
);

create table if not exists public.city_council_sessions (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  session_type public.city_council_session_type not null default 'city',
  title text not null,
  agenda text,
  started_by uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  status public.city_council_session_status not null default 'scheduled',
  voice_room_id uuid references public.city_voice_rooms (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.city_voice_rooms
  add constraint city_voice_rooms_council_session_fk
  foreign key (council_session_id) references public.city_council_sessions (id) on delete set null;

create table if not exists public.city_council_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.city_council_sessions (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  proposal_id uuid references public.city_council_proposals (id) on delete set null,
  title text not null,
  decision_text text not null,
  status public.city_council_decision_status not null default 'draft',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.city_council_decision_votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.city_council_decisions (id) on delete cascade,
  council_member_user_id uuid not null references public.profiles (id) on delete cascade,
  vote public.city_council_vote_choice not null,
  created_at timestamptz not null default now(),
  unique (decision_id, council_member_user_id)
);

create trigger city_council_proposals_updated_at
  before update on public.city_council_proposals
  for each row execute function public.set_updated_at();

create or replace function public.sync_city_proposal_support_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.city_council_proposals p
  set support_count = (select count(*) from public.city_proposal_supports s where s.proposal_id = p.id)
  where p.id = coalesce(new.proposal_id, old.proposal_id);
  return coalesce(new, old);
end; $$;

create trigger city_proposal_support_count_sync
  after insert or delete on public.city_proposal_supports
  for each row execute function public.sync_city_proposal_support_count();

alter type public.notification_event_type add value if not exists 'council_session_started';
alter type public.notification_event_type add value if not exists 'city_proposal_qualified';
alter type public.notification_event_type add value if not exists 'decision_approved';

create or replace function public.create_city_council_proposal(
  p_region_id text,
  p_title text,
  p_description text default null,
  p_category public.city_proposal_category default 'other'
)
returns public.city_council_proposals
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_row public.city_council_proposals;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.city_memberships where user_id = v_user_id and region_id = p_region_id and status = 'active') then
    raise exception 'must be city member';
  end if;
  insert into public.city_council_proposals (region_id, created_by, title, description, category)
  values (p_region_id, v_user_id, p_title, nullif(btrim(p_description), ''), p_category)
  returning * into v_row;
  return v_row;
end; $$;

create or replace function public.support_city_council_proposal(p_proposal_id uuid)
returns public.city_proposal_supports
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_proposal public.city_council_proposals%rowtype;
  v_config jsonb := public._city_governance_config();
  v_threshold integer := coalesce((v_config ->> 'proposal_support_threshold')::integer, 50);
  v_row public.city_proposal_supports;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  select * into v_proposal from public.city_council_proposals where id = p_proposal_id;
  if not found then raise exception 'proposal not found'; end if;
  if not exists (select 1 from public.city_memberships where user_id = v_user_id and region_id = v_proposal.region_id and status = 'active') then
    raise exception 'must be city member';
  end if;
  insert into public.city_proposal_supports (proposal_id, user_id) values (p_proposal_id, v_user_id)
  returning * into v_row;
  update public.city_council_proposals
  set status = case when support_count >= v_threshold then 'qualified'::public.city_proposal_status else status end,
      qualified_at = case when support_count >= v_threshold then now() else qualified_at end
  where id = p_proposal_id;
  return v_row;
exception when unique_violation then raise exception 'already supported'; end; $$;

create or replace function public.start_city_council_session(
  p_region_id text,
  p_title text,
  p_agenda text default null
)
returns public.city_council_sessions
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_row public.city_council_sessions;
begin
  perform public._require_active_city_leader(v_user_id, p_region_id);
  insert into public.city_council_sessions (region_id, title, agenda, started_by, started_at, status)
  values (p_region_id, p_title, nullif(btrim(p_agenda), ''), v_user_id, now(), 'live')
  returning * into v_row;
  perform public._notify_city_members(
    p_region_id,
    'council_session_started'::public.notification_event_type,
    '🏛️ MECLİS TOPLANDI',
    p_title,
    jsonb_build_object('session_id', v_row.id, 'deep_link', '/council/' || v_row.id::text),
    v_user_id
  );
  return v_row;
end; $$;

alter table public.city_council_proposals enable row level security;
alter table public.city_proposal_supports enable row level security;
alter table public.city_council_sessions enable row level security;
alter table public.city_council_decisions enable row level security;
alter table public.city_council_decision_votes enable row level security;

create policy city_council_proposals_select on public.city_council_proposals for select to authenticated using (true);
create policy city_proposal_supports_select on public.city_proposal_supports for select to authenticated using (true);
create policy city_council_sessions_select on public.city_council_sessions for select to authenticated using (true);
create policy city_council_decisions_select on public.city_council_decisions for select to authenticated using (true);

grant execute on function public.create_city_council_proposal(text, text, text, public.city_proposal_category) to authenticated;
grant execute on function public.support_city_council_proposal(uuid) to authenticated;
grant execute on function public.start_city_council_session(text, text, text) to authenticated;

alter publication supabase_realtime add table public.city_council_proposals;
alter publication supabase_realtime add table public.city_council_sessions;
