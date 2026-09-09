-- Vora City Governance — Phase 2: liderlik geçmişi, finalize, bildirimler

create type public.city_leadership_term_status as enum ('active', 'completed', 'removed');
create type public.city_history_event_type as enum (
  'leader_elected',
  'council_elected',
  'agreement_signed',
  'joint_room',
  'joint_council',
  'decision_passed',
  'election_started',
  'major_event'
);

create table if not exists public.city_leadership_terms (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  election_id uuid references public.city_elections (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.city_leadership_term_status not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists city_leadership_terms_region_active_idx
  on public.city_leadership_terms (region_id, status, started_at desc);

create table if not exists public.city_history_events (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references public.regions (id) on delete cascade,
  event_type public.city_history_event_type not null,
  reference_id uuid,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists city_history_events_region_idx
  on public.city_history_events (region_id, occurred_at desc);

create table if not exists public.governance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  region_id text references public.regions (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists governance_audit_logs_region_idx
  on public.governance_audit_logs (region_id, created_at desc);

alter table public.city_leadership_terms enable row level security;
alter table public.city_history_events enable row level security;
alter table public.governance_audit_logs enable row level security;

create policy city_leadership_terms_select_authenticated
  on public.city_leadership_terms for select to authenticated using (true);

create policy city_leadership_terms_admin_write
  on public.city_leadership_terms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy city_history_events_select_authenticated
  on public.city_history_events for select to authenticated using (true);

create policy city_history_events_admin_write
  on public.city_history_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy governance_audit_logs_select_admin
  on public.governance_audit_logs for select to authenticated
  using (public.is_admin());

create policy governance_audit_logs_insert_definer
  on public.governance_audit_logs for insert to authenticated
  with check (public.is_admin());

alter type public.notification_event_type add value if not exists 'city_election_started';
alter type public.notification_event_type add value if not exists 'city_election_completed';

update public.app_system_config
set value = coalesce(value, '{}'::jsonb) || '{
  "election_nomination_days": 3,
  "election_voting_days": 7
}'::jsonb
where key = 'city_governance';

create or replace function public._notify_city_members(
  p_region_id text,
  p_event_type public.notification_event_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, event_type, title, body, actor_id, data, category, priority)
  select
    cm.user_id,
    p_event_type,
    p_title,
    p_body,
    p_actor_id,
    p_data || jsonb_build_object('region_id', p_region_id),
    'social'::public.notification_category,
    'normal'::public.notification_priority
  from public.city_memberships cm
  where cm.region_id = p_region_id and cm.status = 'active';

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    p_event_type,
    p_title,
    p_body,
    p_data || jsonb_build_object('region_id', p_region_id),
    p_actor_id
  from public.city_memberships cm
  where cm.region_id = p_region_id and cm.status = 'active';
end;
$$;

create or replace function public.admin_create_city_leader_election(
  p_region_id text,
  p_title text default null
)
returns public.city_elections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config jsonb := public._city_governance_config();
  v_nomination_days integer := coalesce((v_config ->> 'election_nomination_days')::integer, 3);
  v_voting_days integer := coalesce((v_config ->> 'election_voting_days')::integer, 7);
  v_region public.regions%rowtype;
  v_election public.city_elections;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_region from public.regions where id = p_region_id;
  if not found then
    raise exception 'region not found';
  end if;

  if exists (
    select 1 from public.city_elections e
    where e.region_id = p_region_id
      and e.election_type = 'leader'
      and e.status not in ('completed', 'cancelled')
  ) then
    raise exception 'active leader election already exists';
  end if;

  v_title := coalesce(nullif(btrim(p_title), ''), v_region.name || ' Liderlik Seçimi');

  insert into public.city_elections (
    region_id,
    election_type,
    title,
    description,
    starts_at,
    nomination_ends_at,
    voting_starts_at,
    ends_at,
    status
  )
  values (
    p_region_id,
    'leader',
    v_title,
    v_region.name || ' şehir lideri seçimi',
    now(),
    now() + make_interval(days => v_nomination_days),
    now() + make_interval(days => v_nomination_days),
    now() + make_interval(days => v_nomination_days + v_voting_days),
    'nomination'
  )
  returning * into v_election;

  insert into public.city_history_events (
    region_id, event_type, reference_id, title, description, metadata
  )
  values (
    p_region_id,
    'election_started',
    v_election.id,
    v_title,
    'Liderlik seçimi başladı',
    jsonb_build_object('election_id', v_election.id)
  );

  insert into public.governance_audit_logs (actor_user_id, region_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    p_region_id,
    'ELECTION_CREATED',
    'city_election',
    v_election.id,
    jsonb_build_object('election_type', 'leader')
  );

  perform public._notify_city_members(
    p_region_id,
    'city_election_started'::public.notification_event_type,
    '🗳️ ' || upper(v_region.name) || ' SEÇİYOR',
    'Yeni şehir lideri için adaylık ve oy süreci başladı.',
    jsonb_build_object(
      'election_id', v_election.id,
      'deep_link', '/city/' || coalesce(v_region.slug, v_region.id) || '/election/' || v_election.id::text
    ),
    auth.uid()
  );

  return v_election;
end;
$$;

create or replace function public.finalize_city_election(p_election_id uuid)
returns public.city_elections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.city_elections%rowtype;
  v_region public.regions%rowtype;
  v_winner_user_id uuid;
  v_winner_name text;
  v_config jsonb := public._city_governance_config();
  v_term_days integer := coalesce((v_config ->> 'leader_term_days')::integer, 30);
begin
  v_election := public.refresh_city_election_status(p_election_id);

  if v_election.status not in ('counting', 'voting') then
    raise exception 'election cannot be finalized in status %', v_election.status;
  end if;

  if v_election.status = 'voting' and now() < v_election.ends_at and not public.is_admin() then
    raise exception 'voting period not ended';
  end if;

  select * into v_region from public.regions where id = v_election.region_id;

  select v.candidate_user_id
  into v_winner_user_id
  from (
    select ev.candidate_user_id, count(*)::integer as vote_count, min(ev.created_at) as first_vote
    from public.city_election_votes ev
    where ev.election_id = p_election_id
    group by ev.candidate_user_id
    order by vote_count desc, first_vote asc
    limit 1
  ) v;

  update public.city_elections
  set status = 'completed', updated_at = now()
  where id = p_election_id
  returning * into v_election;

  if v_winner_user_id is not null and v_election.election_type = 'leader' then
    update public.city_leadership_terms
    set status = 'completed', ended_at = now()
    where region_id = v_election.region_id and status = 'active';

    update public.city_memberships
    set role = 'citizen', updated_at = now()
    where region_id = v_election.region_id
      and status = 'active'
      and role = 'leader'
      and user_id <> v_winner_user_id;

    insert into public.city_memberships (region_id, user_id, role, status, joined_at)
    values (v_election.region_id, v_winner_user_id, 'leader', 'active', now())
    on conflict (region_id, user_id) do update
      set role = 'leader', status = 'active', updated_at = now();

    insert into public.city_leadership_terms (
      region_id, user_id, election_id, started_at, status
    )
    values (
      v_election.region_id,
      v_winner_user_id,
      v_election.id,
      now(),
      'active'
    );

    select coalesce(p.full_name, '@' || p.username) into v_winner_name
    from public.profiles p where p.id = v_winner_user_id;

    insert into public.city_history_events (
      region_id, event_type, reference_id, title, description, metadata, occurred_at
    )
    values (
      v_election.region_id,
      'leader_elected',
      v_election.id,
      '👑 Yeni ' || v_region.name || ' Lideri',
      coalesce(v_winner_name, 'Yeni lider') || ' seçildi.',
      jsonb_build_object(
        'election_id', v_election.id,
        'winner_user_id', v_winner_user_id,
        'term_days', v_term_days
      ),
      now()
    );

    perform public._notify_city_members(
      v_election.region_id,
      'city_election_completed'::public.notification_event_type,
      '👑 ' || upper(v_region.name) || ' LİDERİ SEÇİLDİ',
      coalesce(v_winner_name, 'Yeni lider') || ' şehir lideri oldu.',
      jsonb_build_object(
        'election_id', v_election.id,
        'winner_user_id', v_winner_user_id,
        'deep_link', '/city/' || coalesce(v_region.slug, v_region.id)
      ),
      v_winner_user_id
    );
  end if;

  insert into public.governance_audit_logs (actor_user_id, region_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    v_election.region_id,
    'ELECTION_FINALIZED',
    'city_election',
    v_election.id,
    jsonb_build_object('winner_user_id', v_winner_user_id)
  );

  return v_election;
end;
$$;

create or replace function public.get_city_election_vote_counts(p_election_id uuid)
returns table (candidate_user_id uuid, vote_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select ev.candidate_user_id, count(*) as vote_count
  from public.city_election_votes ev
  where ev.election_id = p_election_id
  group by ev.candidate_user_id
  order by vote_count desc;
$$;

grant execute on function public.admin_create_city_leader_election(text, text) to authenticated;
grant execute on function public.finalize_city_election(uuid) to authenticated;
grant execute on function public.get_city_election_vote_counts(uuid) to authenticated, anon;
