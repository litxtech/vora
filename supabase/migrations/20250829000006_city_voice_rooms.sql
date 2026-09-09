-- Vora City Governance — Phase 4: sesli odalar

create type public.city_voice_room_type as enum (
  'city',
  'joint_city',
  'leader_private',
  'city_council',
  'joint_council',
  'regional_council'
);

create type public.city_voice_room_status as enum (
  'scheduled',
  'live',
  'ended',
  'cancelled'
);

create type public.city_voice_participant_role as enum (
  'listener',
  'speaker',
  'city_leader',
  'council_member',
  'moderator',
  'admin'
);

create type public.city_speaker_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create table if not exists public.city_voice_rooms (
  id uuid primary key default gen_random_uuid(),
  livekit_room_name text unique not null,
  room_type public.city_voice_room_type not null,
  region_ids text[] not null default '{}',
  title text not null,
  status public.city_voice_room_status not null default 'live',
  diplomacy_request_id uuid references public.city_diplomacy_requests (id) on delete set null,
  council_session_id uuid,
  started_by uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  listener_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.city_diplomacy_requests
  add constraint city_diplomacy_requests_voice_room_fk
  foreign key (voice_room_id) references public.city_voice_rooms (id) on delete set null;

create table if not exists public.city_voice_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.city_voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  region_id text references public.regions (id) on delete set null,
  role public.city_voice_participant_role not null default 'listener',
  is_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

create table if not exists public.city_voice_speaker_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.city_voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id) on delete cascade,
  status public.city_speaker_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists city_voice_rooms_status_idx
  on public.city_voice_rooms (status, started_at desc);

create trigger city_voice_rooms_updated_at
  before update on public.city_voice_rooms
  for each row execute function public.set_updated_at();

create or replace function public.sync_city_voice_listener_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid := coalesce(new.room_id, old.room_id);
begin
  update public.city_voice_rooms r
  set listener_count = (
    select count(*)::integer from public.city_voice_room_participants p
    where p.room_id = v_room_id and p.left_at is null
  )
  where r.id = v_room_id;
  return coalesce(new, old);
end;
$$;

create trigger city_voice_participants_count_sync
  after insert or update or delete on public.city_voice_room_participants
  for each row execute function public.sync_city_voice_listener_count();

create or replace function public._city_voice_room_name(p_prefix text, p_id uuid)
returns text
language sql
immutable
as $$
  select lower(p_prefix || '_' || replace(p_id::text, '-', ''));
$$;

create or replace function public.propose_joint_room(p_diplomacy_request_id uuid)
returns public.city_diplomacy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.city_diplomacy_requests%rowtype;
begin
  select * into v_request from public.city_diplomacy_requests where id = p_diplomacy_request_id;
  if not found or v_request.status <> 'accepted' then raise exception 'invalid diplomacy state'; end if;
  if v_user_id not in (v_request.from_leader_user_id, v_request.to_leader_user_id) then
    raise exception 'not authorized';
  end if;

  update public.city_diplomacy_requests
  set request_type = 'joint_room', title = coalesce(title, 'Ortak şehir odası'), updated_at = now()
  where id = p_diplomacy_request_id
  returning * into v_request;

  perform public._notify_city_members(
    case when v_user_id = v_request.from_leader_user_id then v_request.to_region_id else v_request.from_region_id end,
    'joint_room_proposed'::public.notification_event_type,
    '🤝 ORTAK ODA TEKLİFİ',
    'Karşı lider ortak şehir odası öneriyor.',
    jsonb_build_object('request_id', v_request.id),
    v_user_id
  );

  return v_request;
end;
$$;

create or replace function public.accept_joint_room(p_diplomacy_request_id uuid)
returns public.city_voice_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.city_diplomacy_requests%rowtype;
  v_room public.city_voice_rooms;
  v_room_name text;
  v_from public.regions%rowtype;
  v_to public.regions%rowtype;
  v_title text;
begin
  select * into v_request from public.city_diplomacy_requests where id = p_diplomacy_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if v_request.voice_room_id is not null then
    select * into v_room from public.city_voice_rooms where id = v_request.voice_room_id;
    return v_room;
  end if;
  if v_request.status <> 'accepted' then raise exception 'request not accepted'; end if;
  if v_user_id not in (v_request.from_leader_user_id, v_request.to_leader_user_id) then
    raise exception 'not authorized';
  end if;

  select * into v_from from public.regions where id = v_request.from_region_id;
  select * into v_to from public.regions where id = v_request.to_region_id;
  v_title := upper(v_from.name) || ' × ' || upper(v_to.name);
  v_room_name := public._city_voice_room_name('vora_joint', p_diplomacy_request_id);

  insert into public.city_voice_rooms (
    livekit_room_name, room_type, region_ids, title, status,
    diplomacy_request_id, started_by, metadata
  )
  values (
    v_room_name,
    'joint_city',
    array[v_request.from_region_id, v_request.to_region_id],
    v_title,
    'live',
    p_diplomacy_request_id,
    v_user_id,
    jsonb_build_object('from_region_id', v_request.from_region_id, 'to_region_id', v_request.to_region_id)
  )
  returning * into v_room;

  update public.city_diplomacy_requests set voice_room_id = v_room.id where id = p_diplomacy_request_id;

  insert into public.city_voice_room_participants (room_id, user_id, region_id, role)
  values
    (v_room.id, v_request.from_leader_user_id, v_request.from_region_id, 'city_leader'),
    (v_room.id, v_request.to_leader_user_id, v_request.to_region_id, 'city_leader')
  on conflict (room_id, user_id) do nothing;

  insert into public.city_history_events (region_id, event_type, reference_id, title, description, metadata)
  values
    (v_request.from_region_id, 'joint_room', v_room.id, v_title, 'Ortak şehir görüşmesi başladı.', jsonb_build_object('room_id', v_room.id)),
    (v_request.to_region_id, 'joint_room', v_room.id, v_title, 'Ortak şehir görüşmesi başladı.', jsonb_build_object('room_id', v_room.id));

  perform public._notify_city_members(
    v_request.from_region_id,
    'joint_room_started'::public.notification_event_type,
    '🚨 ' || v_title,
    'Liderler anlaştı. İki şehir birleşiyor. VORA''YA GEL!',
    jsonb_build_object(
      'room_id', v_room.id,
      'deep_link', '/room/' || v_room.id::text
    ),
    v_user_id
  );

  perform public._notify_city_members(
    v_request.to_region_id,
    'joint_room_started'::public.notification_event_type,
    '🚨 ' || v_title,
    'Liderler anlaştı. İki şehir birleşiyor. VORA''YA GEL!',
    jsonb_build_object(
      'room_id', v_room.id,
      'deep_link', '/room/' || v_room.id::text
    ),
    v_user_id
  );

  return v_room;
end;
$$;

create or replace function public.join_city_voice_room(p_room_id uuid)
returns public.city_voice_room_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.city_voice_rooms%rowtype;
  v_membership public.city_memberships%rowtype;
  v_participant public.city_voice_room_participants;
  v_role public.city_voice_participant_role := 'listener';
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_room from public.city_voice_rooms where id = p_room_id;
  if not found or v_room.status <> 'live' then raise exception 'room not live'; end if;

  select * into v_membership from public.city_memberships
  where user_id = v_user_id and region_id = any(v_room.region_ids) and status = 'active';

  if v_membership.id is null and not public.is_admin() then
    raise exception 'must be member of participating city';
  end if;

  if v_membership.role = 'leader' then v_role := 'city_leader'; end if;

  insert into public.city_voice_room_participants (room_id, user_id, region_id, role, left_at)
  values (p_room_id, v_user_id, v_membership.region_id, v_role, null)
  on conflict (room_id, user_id) do update
    set left_at = null, role = excluded.role, joined_at = now()
  returning * into v_participant;

  return v_participant;
end;
$$;

create or replace function public.leave_city_voice_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.city_voice_room_participants
  set left_at = now(), role = 'listener'
  where room_id = p_room_id and user_id = auth.uid() and left_at is null;
end;
$$;

create or replace function public.request_city_voice_speaker(p_room_id uuid)
returns public.city_voice_speaker_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.city_memberships%rowtype;
  v_room public.city_voice_rooms%rowtype;
  v_row public.city_voice_speaker_requests;
begin
  select * into v_room from public.city_voice_rooms where id = p_room_id;
  if not found then raise exception 'room not found'; end if;

  select * into v_membership from public.city_memberships
  where user_id = v_user_id and region_id = any(v_room.region_ids) and status = 'active';

  if v_membership.id is null then raise exception 'not a city member'; end if;

  insert into public.city_voice_speaker_requests (room_id, user_id, region_id, status)
  values (p_room_id, v_user_id, v_membership.region_id, 'pending')
  on conflict (room_id, user_id) do update set status = 'pending', created_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.approve_city_voice_speaker(
  p_room_id uuid,
  p_user_id uuid
)
returns public.city_voice_room_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leader_id uuid := auth.uid();
  v_target_membership public.city_memberships%rowtype;
  v_leader_membership public.city_memberships%rowtype;
  v_participant public.city_voice_room_participants;
begin
  select * into v_target_membership from public.city_memberships
  where user_id = p_user_id and status = 'active';

  select * into v_leader_membership from public.city_memberships
  where user_id = v_leader_id and status = 'active' and role = 'leader'
    and region_id = v_target_membership.region_id;

  if v_leader_membership.id is null and not public.is_admin() then
    raise exception 'can only approve speakers from your city';
  end if;

  update public.city_voice_speaker_requests
  set status = 'approved'
  where room_id = p_room_id and user_id = p_user_id;

  update public.city_voice_room_participants
  set role = 'speaker', is_muted = false
  where room_id = p_room_id and user_id = p_user_id and left_at is null
  returning * into v_participant;

  if v_participant.id is null then
    insert into public.city_voice_room_participants (room_id, user_id, region_id, role)
    values (p_room_id, p_user_id, v_target_membership.region_id, 'speaker')
    returning * into v_participant;
  end if;

  return v_participant;
end;
$$;

create or replace function public.end_city_voice_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.city_voice_rooms%rowtype;
  v_user_id uuid := auth.uid();
begin
  select * into v_room from public.city_voice_rooms where id = p_room_id;
  if not found then return; end if;

  if v_room.started_by <> v_user_id and not public.is_admin() then
    if not exists (
      select 1 from public.city_memberships cm
      where cm.user_id = v_user_id and cm.region_id = any(v_room.region_ids)
        and cm.status = 'active' and cm.role = 'leader'
    ) then
      raise exception 'not authorized';
    end if;
  end if;

  update public.city_voice_rooms set status = 'ended', ended_at = now() where id = p_room_id;
  update public.city_voice_room_participants set left_at = now() where room_id = p_room_id and left_at is null;
end;
$$;

alter table public.city_voice_rooms enable row level security;
alter table public.city_voice_room_participants enable row level security;
alter table public.city_voice_speaker_requests enable row level security;

create policy city_voice_rooms_select on public.city_voice_rooms for select to authenticated using (true);
create policy city_voice_rooms_admin_write on public.city_voice_rooms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy city_voice_participants_select on public.city_voice_room_participants for select to authenticated using (true);
create policy city_voice_participants_own on public.city_voice_room_participants for all to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy city_voice_speaker_requests_select on public.city_voice_speaker_requests for select to authenticated using (true);
create policy city_voice_speaker_requests_own on public.city_voice_speaker_requests for all to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

grant execute on function public.propose_joint_room(uuid) to authenticated;
grant execute on function public.accept_joint_room(uuid) to authenticated;
grant execute on function public.join_city_voice_room(uuid) to authenticated;
grant execute on function public.leave_city_voice_room(uuid) to authenticated;
grant execute on function public.request_city_voice_speaker(uuid) to authenticated;
grant execute on function public.approve_city_voice_speaker(uuid, uuid) to authenticated;
grant execute on function public.end_city_voice_room(uuid) to authenticated;

alter publication supabase_realtime add table public.city_voice_rooms;
alter publication supabase_realtime add table public.city_voice_speaker_requests;
