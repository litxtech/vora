-- Vora City Governance — Phase 3: diplomasi

create type public.city_diplomacy_request_type as enum (
  'leader_call',
  'joint_room',
  'joint_council',
  'cooperation',
  'challenge'
);

create type public.city_diplomacy_status as enum (
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'expired'
);

create table if not exists public.city_diplomacy_requests (
  id uuid primary key default gen_random_uuid(),
  from_region_id text not null references public.regions (id) on delete cascade,
  to_region_id text not null references public.regions (id) on delete cascade,
  from_leader_user_id uuid not null references public.profiles (id) on delete cascade,
  to_leader_user_id uuid not null references public.profiles (id) on delete cascade,
  request_type public.city_diplomacy_request_type not null,
  title text,
  message text,
  status public.city_diplomacy_status not null default 'pending',
  call_session_id uuid references public.call_sessions (id) on delete set null,
  voice_room_id uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (from_region_id <> to_region_id)
);

create index if not exists city_diplomacy_requests_to_leader_idx
  on public.city_diplomacy_requests (to_leader_user_id, status, created_at desc);

create index if not exists city_diplomacy_requests_from_leader_idx
  on public.city_diplomacy_requests (from_leader_user_id, status, created_at desc);

create trigger city_diplomacy_requests_updated_at
  before update on public.city_diplomacy_requests
  for each row execute function public.set_updated_at();

alter type public.notification_event_type add value if not exists 'city_diplomacy_request_received';
alter type public.notification_event_type add value if not exists 'leader_call_received';
alter type public.notification_event_type add value if not exists 'joint_room_proposed';
alter type public.notification_event_type add value if not exists 'joint_room_started';
alter type public.notification_event_type add value if not exists 'city_leader_call';

create or replace function public._require_active_city_leader(
  p_user_id uuid,
  p_region_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.city_memberships cm
    where cm.user_id = p_user_id
      and cm.region_id = p_region_id
      and cm.status = 'active'
      and cm.role = 'leader'
  ) then
    raise exception 'active city leader required';
  end if;
end;
$$;

create or replace function public.send_diplomacy_request(
  p_to_region_id text,
  p_request_type public.city_diplomacy_request_type,
  p_title text default null,
  p_message text default null
)
returns public.city_diplomacy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_from_region_id text;
  v_to_leader_user_id uuid;
  v_request public.city_diplomacy_requests;
  v_to_region public.regions%rowtype;
  v_from_region public.regions%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select cm.region_id into v_from_region_id
  from public.city_memberships cm
  where cm.user_id = v_user_id and cm.status = 'active' and cm.role = 'leader'
  limit 1;

  if v_from_region_id is null then raise exception 'you are not an active city leader'; end if;
  if v_from_region_id = p_to_region_id then raise exception 'cannot send to same city'; end if;

  perform public._require_active_city_leader(v_user_id, v_from_region_id);

  select cm.user_id into v_to_leader_user_id
  from public.city_memberships cm
  where cm.region_id = p_to_region_id and cm.status = 'active' and cm.role = 'leader'
  limit 1;

  if v_to_leader_user_id is null then raise exception 'target city has no active leader'; end if;

  if exists (
    select 1 from public.city_diplomacy_requests r
    where r.from_region_id = v_from_region_id
      and r.to_region_id = p_to_region_id
      and r.request_type = p_request_type
      and r.status = 'pending'
  ) then
    raise exception 'pending request already exists';
  end if;

  insert into public.city_diplomacy_requests (
    from_region_id, to_region_id, from_leader_user_id, to_leader_user_id,
    request_type, title, message, expires_at
  )
  values (
    v_from_region_id, p_to_region_id, v_user_id, v_to_leader_user_id,
    p_request_type, nullif(btrim(p_title), ''), nullif(btrim(p_message), ''),
    now() + interval '48 hours'
  )
  returning * into v_request;

  select * into v_from_region from public.regions where id = v_from_region_id;
  select * into v_to_region from public.regions where id = p_to_region_id;

  insert into public.governance_audit_logs (actor_user_id, region_id, action, target_type, target_id, metadata)
  values (v_user_id, v_from_region_id, 'LEADER_SENT_DIPLOMACY_REQUEST', 'city_diplomacy_request', v_request.id,
    jsonb_build_object('to_region_id', p_to_region_id, 'request_type', p_request_type));

  perform public._notify_city_members(
    p_to_region_id,
    'city_diplomacy_request_received'::public.notification_event_type,
    '👑 ' || upper(v_from_region.name) || ' LİDERİ',
    coalesce(v_request.message, 'Görüşme talebi gönderdi.'),
    jsonb_build_object(
      'request_id', v_request.id,
      'from_region_id', v_from_region_id,
      'deep_link', '/city/' || coalesce(v_to_region.slug, v_to_region.id) || '/diplomacy'
    ),
    v_user_id
  );

  return v_request;
end;
$$;

create or replace function public.respond_diplomacy_request(
  p_request_id uuid,
  p_accept boolean
)
returns public.city_diplomacy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.city_diplomacy_requests%rowtype;
  v_channel_name text;
  v_session public.call_sessions%rowtype;
  v_from_region public.regions%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_request from public.city_diplomacy_requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'request not pending'; end if;
  if v_request.to_leader_user_id <> v_user_id then raise exception 'not authorized'; end if;

  if not p_accept then
    update public.city_diplomacy_requests
    set status = 'rejected', responded_at = now(), updated_at = now()
    where id = p_request_id
    returning * into v_request;
    return v_request;
  end if;

  update public.city_diplomacy_requests
  set status = 'accepted', responded_at = now(), updated_at = now()
  where id = p_request_id
  returning * into v_request;

  if v_request.request_type = 'leader_call' then
    v_channel_name := 'kd_leader_' || replace(p_request_id::text, '-', '');
    insert into public.call_sessions (channel_name, caller_id, callee_id, call_type, status, started_at)
    values (
      v_channel_name,
      v_request.from_leader_user_id,
      v_request.to_leader_user_id,
      'audio',
      'accepted',
      now()
    )
    returning * into v_session;

    update public.city_diplomacy_requests
    set call_session_id = v_session.id
    where id = p_request_id
    returning * into v_request;
  end if;

  select * into v_from_region from public.regions where id = v_request.from_region_id;

  perform public._notify_city_members(
    v_request.from_region_id,
    'leader_call_received'::public.notification_event_type,
    '📡 LİDER HATTI',
    'Talebin kabul edildi.',
    jsonb_build_object(
      'request_id', v_request.id,
      'call_session_id', v_request.call_session_id,
      'deep_link', case when v_request.call_session_id is not null
        then '/leader-line/' || v_request.call_session_id::text else '/city/' || v_from_region.slug end
    ),
    v_user_id
  );

  insert into public.governance_audit_logs (actor_user_id, region_id, action, target_type, target_id, metadata)
  values (v_user_id, v_request.to_region_id, 'LEADER_ACCEPTED_DIPLOMACY_REQUEST', 'city_diplomacy_request', v_request.id, '{}'::jsonb);

  return v_request;
end;
$$;

alter table public.city_diplomacy_requests enable row level security;

create policy city_diplomacy_requests_select
  on public.city_diplomacy_requests for select to authenticated
  using (
    from_leader_user_id = auth.uid()
    or to_leader_user_id = auth.uid()
    or public.is_admin()
  );

create policy city_diplomacy_requests_admin_write
  on public.city_diplomacy_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant execute on function public.send_diplomacy_request(text, public.city_diplomacy_request_type, text, text) to authenticated;
grant execute on function public.respond_diplomacy_request(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.city_diplomacy_requests;
