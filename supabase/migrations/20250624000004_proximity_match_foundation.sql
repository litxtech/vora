-- Yakınlık eşleşmesi: 500 m içindeki kullanıcılar, karşılıklı onay ile eşleşme

-- ─── Konum yayını ────────────────────────────────────────────────────────────

create table if not exists public.proximity_match_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  updated_at timestamptz not null default now()
);

create index if not exists proximity_match_presence_location_idx
  on public.proximity_match_presence using gist (location);

create index if not exists proximity_match_presence_updated_idx
  on public.proximity_match_presence (updated_at desc);

alter table public.proximity_match_presence enable row level security;

create policy "proximity_match_presence_read"
  on public.proximity_match_presence
  for select
  to authenticated
  using (
    updated_at > now() - interval '3 minutes'
    and user_id is distinct from auth.uid()
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = proximity_match_presence.user_id)
         or (ub.blocker_id = proximity_match_presence.user_id and ub.blocked_id = auth.uid())
    )
  );

create policy "proximity_match_presence_self_write"
  on public.proximity_match_presence
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Eşleşme etkileşimleri ───────────────────────────────────────────────────

create table if not exists public.proximity_match_interactions (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  low_decision text check (low_decision in ('yes', 'no')),
  high_decision text check (high_decision in ('yes', 'no')),
  low_decided_at timestamptz,
  high_decided_at timestamptz,
  matched_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint proximity_match_interactions_ordered check (user_low < user_high)
);

create index if not exists proximity_match_interactions_matched_idx
  on public.proximity_match_interactions (matched_at desc)
  where matched_at is not null;

create index if not exists proximity_match_interactions_cooldown_idx
  on public.proximity_match_interactions (cooldown_until)
  where cooldown_until is not null;

alter table public.proximity_match_interactions enable row level security;

create policy "proximity_match_interactions_involved_read"
  on public.proximity_match_interactions
  for select
  to authenticated
  using (auth.uid() in (user_low, user_high));

-- ─── Yardımcı: çift sıralama ─────────────────────────────────────────────────

create or replace function public._proximity_pair_ids(a uuid, b uuid)
returns table(user_low uuid, user_high uuid)
language sql
immutable
as $$
  select least(a, b), greatest(a, b);
$$;

-- ─── RPC: konum yayınla ──────────────────────────────────────────────────────

create or replace function public.upsert_proximity_match_presence(
  p_region_id text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birth date;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  select birth_date into v_birth
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
    and is_guest = false;

  if v_birth is null or v_birth > (current_date - interval '18 years')::date then
    return;
  end if;

  insert into public.proximity_match_presence (
    user_id, region_id, latitude, longitude, updated_at
  )
  values (
    auth.uid(), p_region_id, p_latitude, p_longitude, now()
  )
  on conflict (user_id) do update set
    region_id = excluded.region_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();
end;
$$;

-- ─── RPC: konum temizle ──────────────────────────────────────────────────────

create or replace function public.clear_proximity_match_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.proximity_match_presence where user_id = auth.uid();
end;
$$;

-- ─── RPC: yakındaki aday ─────────────────────────────────────────────────────

create or replace function public.find_nearby_proximity_candidate(
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  distance_m double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_origin geography;
begin
  if v_me is null then
    return;
  end if;

  v_origin := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_verified,
    st_distance(pmp.location, v_origin)::double precision as distance_m
  from public.proximity_match_presence pmp
  inner join public.profiles p on p.id = pmp.user_id
  left join public.proximity_match_interactions i
    on i.user_low = least(v_me, pmp.user_id)
   and i.user_high = greatest(v_me, pmp.user_id)
  where pmp.user_id is distinct from v_me
    and pmp.updated_at > now() - interval '3 minutes'
    and p.account_status = 'active'
    and p.is_guest = false
    and p.birth_date is not null
    and p.birth_date <= (current_date - interval '18 years')::date
    and st_dwithin(pmp.location, v_origin, 500)
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = v_me and ub.blocked_id = pmp.user_id)
         or (ub.blocker_id = pmp.user_id and ub.blocked_id = v_me)
    )
    and (i.matched_at is null)
    and (i.cooldown_until is null or i.cooldown_until <= now())
    and not (
      (i.user_low = v_me and i.low_decision is not null)
      or (i.user_high = v_me and i.high_decision is not null)
    )
  order by distance_m asc
  limit 1;
end;
$$;

-- ─── RPC: eşleşme kararı ─────────────────────────────────────────────────────

create or replace function public.submit_proximity_match_decision(
  p_other_user_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_row public.proximity_match_interactions%rowtype;
  v_other_decision text;
  v_my_decision text;
begin
  if v_me is null then
    raise exception 'Oturum gerekli';
  end if;

  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'Geçersiz kullanıcı';
  end if;

  if p_decision not in ('yes', 'no') then
    raise exception 'Geçersiz karar';
  end if;

  select user_low, user_high into v_low, v_high
  from public._proximity_pair_ids(v_me, p_other_user_id);

  select * into v_row
  from public.proximity_match_interactions
  where user_low = v_low and user_high = v_high;

  if found and v_row.matched_at is not null then
    return jsonb_build_object('status', 'already_matched', 'other_user_id', p_other_user_id);
  end if;

  if found and v_row.cooldown_until is not null and v_row.cooldown_until > now() then
    return jsonb_build_object('status', 'cooldown', 'other_user_id', p_other_user_id);
  end if;

  if not found then
    insert into public.proximity_match_interactions (user_low, user_high)
    values (v_low, v_high)
    returning * into v_row;
  end if;

  if v_me = v_low then
    if v_row.low_decision is not null then
      return jsonb_build_object('status', 'already_decided', 'other_user_id', p_other_user_id);
    end if;

    update public.proximity_match_interactions
    set
      low_decision = p_decision,
      low_decided_at = now(),
      cooldown_until = case when p_decision = 'no' then now() + interval '1 day' else cooldown_until end,
      matched_at = case
        when p_decision = 'yes' and high_decision = 'yes' then now()
        else matched_at
      end
    where user_low = v_low and user_high = v_high
    returning * into v_row;
  else
    if v_row.high_decision is not null then
      return jsonb_build_object('status', 'already_decided', 'other_user_id', p_other_user_id);
    end if;

    update public.proximity_match_interactions
    set
      high_decision = p_decision,
      high_decided_at = now(),
      cooldown_until = case when p_decision = 'no' then now() + interval '1 day' else cooldown_until end,
      matched_at = case
        when p_decision = 'yes' and low_decision = 'yes' then now()
        else matched_at
      end
    where user_low = v_low and user_high = v_high
    returning * into v_row;
  end if;

  if p_decision = 'no' then
    return jsonb_build_object('status', 'declined', 'other_user_id', p_other_user_id);
  end if;

  if v_row.matched_at is not null then
    return jsonb_build_object('status', 'matched', 'other_user_id', p_other_user_id);
  end if;

  return jsonb_build_object('status', 'waiting', 'other_user_id', p_other_user_id);
end;
$$;

-- ─── RPC: eşleşilenler listesi ───────────────────────────────────────────────

create or replace function public.list_proximity_matches()
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  matched_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when i.user_low = auth.uid() then p_high.id
      else p_low.id
    end as user_id,
    case
      when i.user_low = auth.uid() then p_high.username
      else p_low.username
    end as username,
    case
      when i.user_low = auth.uid() then p_high.full_name
      else p_low.full_name
    end as full_name,
    case
      when i.user_low = auth.uid() then p_high.avatar_url
      else p_low.avatar_url
    end as avatar_url,
    case
      when i.user_low = auth.uid() then p_high.is_verified
      else p_low.is_verified
    end as is_verified,
    i.matched_at
  from public.proximity_match_interactions i
  inner join public.profiles p_low on p_low.id = i.user_low
  inner join public.profiles p_high on p_high.id = i.user_high
  where i.matched_at is not null
    and auth.uid() in (i.user_low, i.user_high)
    and (
      (i.user_low = auth.uid() and p_high.account_status = 'active')
      or (i.user_high = auth.uid() and p_low.account_status = 'active')
    )
  order by i.matched_at desc;
$$;

-- ─── RPC: eşleşme sayısı ─────────────────────────────────────────────────────

create or replace function public.count_proximity_matches()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.proximity_match_interactions i
  where i.matched_at is not null
    and auth.uid() in (i.user_low, i.user_high);
$$;

grant execute on function public.upsert_proximity_match_presence(text, double precision, double precision)
  to authenticated;
grant execute on function public.clear_proximity_match_presence() to authenticated;
grant execute on function public.find_nearby_proximity_candidate(double precision, double precision)
  to authenticated;
grant execute on function public.submit_proximity_match_decision(uuid, text) to authenticated;
grant execute on function public.list_proximity_matches() to authenticated;
grant execute on function public.count_proximity_matches() to authenticated;

insert into public.app_feature_flags (feature_id, label, feature_group)
values ('proximity-match', 'Yakınlık Eşleşmesi', 'social')
on conflict (feature_id) do nothing;
