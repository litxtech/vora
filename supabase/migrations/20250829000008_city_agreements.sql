-- Vora City Governance — Phase 6: anlaşmalar + gündem

create type public.city_agreement_type as enum (
  'friendship', 'cooperation', 'recurring_room', 'event', 'custom'
);

create type public.city_agreement_status as enum (
  'proposed', 'active', 'ended', 'cancelled'
);

create table if not exists public.city_agreements (
  id uuid primary key default gen_random_uuid(),
  city_a_id text not null references public.regions (id) on delete cascade,
  city_b_id text not null references public.regions (id) on delete cascade,
  agreement_type public.city_agreement_type not null default 'cooperation',
  title text not null,
  description text,
  proposed_by uuid not null references public.profiles (id) on delete cascade,
  approved_by_city_a boolean not null default false,
  approved_by_city_b boolean not null default false,
  status public.city_agreement_status not null default 'proposed',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (city_a_id <> city_b_id)
);

create index if not exists city_agreements_cities_idx
  on public.city_agreements (city_a_id, city_b_id, status);

create or replace function public.propose_city_agreement(
  p_other_region_id text,
  p_title text,
  p_description text default null,
  p_agreement_type public.city_agreement_type default 'cooperation'
)
returns public.city_agreements
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_region_id text;
  v_row public.city_agreements;
begin
  select cm.region_id into v_region_id from public.city_memberships cm
  where cm.user_id = v_user_id and cm.status = 'active' and cm.role = 'leader' limit 1;
  if v_region_id is null then raise exception 'leader required'; end if;

  insert into public.city_agreements (
    city_a_id, city_b_id, agreement_type, title, description, proposed_by,
    approved_by_city_a, status, starts_at
  )
  values (
    v_region_id, p_other_region_id, p_agreement_type, p_title,
    nullif(btrim(p_description), ''), v_user_id, true, 'proposed', now()
  )
  returning * into v_row;

  insert into public.city_history_events (region_id, event_type, reference_id, title, description)
  values (v_region_id, 'agreement_signed', v_row.id, p_title, 'Anlaşma teklifi gönderildi.');

  return v_row;
end; $$;

create or replace function public.approve_city_agreement(p_agreement_id uuid)
returns public.city_agreements
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.city_agreements%rowtype;
  v_region_id text;
begin
  select * into v_row from public.city_agreements where id = p_agreement_id for update;
  select cm.region_id into v_region_id from public.city_memberships cm
  where cm.user_id = v_user_id and cm.status = 'active' and cm.role = 'leader'
    and cm.region_id in (v_row.city_a_id, v_row.city_b_id) limit 1;
  if v_region_id is null then raise exception 'not authorized leader'; end if;

  if v_region_id = v_row.city_a_id then
    update public.city_agreements set approved_by_city_a = true where id = p_agreement_id;
  else
    update public.city_agreements set approved_by_city_b = true where id = p_agreement_id;
  end if;

  update public.city_agreements
  set status = 'active', starts_at = coalesce(starts_at, now())
  where id = p_agreement_id and approved_by_city_a and approved_by_city_b
  returning * into v_row;

  if v_row.status = 'active' then
    insert into public.city_history_events (region_id, event_type, reference_id, title, description)
    values
      (v_row.city_a_id, 'agreement_signed', v_row.id, v_row.title, 'Anlaşma yürürlüğe girdi.'),
      (v_row.city_b_id, 'agreement_signed', v_row.id, v_row.title, 'Anlaşma yürürlüğe girdi.');
  end if;

  return v_row;
end; $$;

create or replace function public.get_city_agenda_feed(p_limit integer default 20)
returns table (
  id uuid,
  feed_type text,
  region_id text,
  title text,
  subtitle text,
  reference_id uuid,
  occurred_at timestamptz,
  metadata jsonb
)
language sql stable security definer set search_path = public as $$
  select * from (
    select h.id, 'history'::text, h.region_id, h.title, h.description, h.reference_id, h.occurred_at, h.metadata
    from public.city_history_events h
    union all
    select r.id, 'live_room'::text, r.region_ids[1], r.title, 'Canlı oda'::text, r.id, r.started_at, r.metadata
    from public.city_voice_rooms r
    where r.status = 'live'
  ) feed
  order by occurred_at desc
  limit p_limit;
$$;

alter type public.notification_event_type add value if not exists 'agreement_proposed';
alter type public.notification_event_type add value if not exists 'agreement_approved';

alter table public.city_agreements enable row level security;
create policy city_agreements_select on public.city_agreements for select to authenticated using (true);

grant execute on function public.propose_city_agreement(text, text, text, public.city_agreement_type) to authenticated;
grant execute on function public.approve_city_agreement(uuid) to authenticated;
grant execute on function public.get_city_agenda_feed(integer) to authenticated, anon;
