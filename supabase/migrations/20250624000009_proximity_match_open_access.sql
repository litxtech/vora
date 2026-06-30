-- Misafir + doğum tarihi zorunluluğu kaldır; presence süresi uzat

drop function if exists public.upsert_proximity_match_presence(text, double precision, double precision);

create or replace function public.upsert_proximity_match_presence(
  p_region_id text,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'inactive_account');
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

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.upsert_proximity_match_presence(text, double precision, double precision)
  to authenticated;

drop policy if exists "proximity_match_presence_read" on public.proximity_match_presence;

create policy "proximity_match_presence_read"
  on public.proximity_match_presence
  for select
  to authenticated
  using (
    updated_at > now() - interval '15 minutes'
    and user_id is distinct from auth.uid()
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = proximity_match_presence.user_id)
         or (ub.blocker_id = proximity_match_presence.user_id and ub.blocked_id = auth.uid())
    )
  );

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
    and pmp.updated_at > now() - interval '15 minutes'
    and p.account_status = 'active'
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
