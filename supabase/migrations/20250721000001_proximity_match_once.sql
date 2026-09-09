-- Yakınlık eşleşmesi: aynı çift / aynı aday yalnızca 1 kez

alter table public.proximity_match_interactions
  add column if not exists low_offered_at timestamptz,
  add column if not exists high_offered_at timestamptz;

create or replace function public.mark_proximity_candidate_offered(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_low uuid;
  v_high uuid;
begin
  if v_me is null or p_other_user_id is null or p_other_user_id = v_me then
    return;
  end if;

  select user_low, user_high into v_low, v_high
  from public._proximity_pair_ids(v_me, p_other_user_id);

  insert into public.proximity_match_interactions (user_low, user_high)
  values (v_low, v_high)
  on conflict (user_low, user_high) do nothing;

  if v_me = v_low then
    update public.proximity_match_interactions
    set low_offered_at = coalesce(low_offered_at, now())
    where user_low = v_low and user_high = v_high;
  else
    update public.proximity_match_interactions
    set high_offered_at = coalesce(high_offered_at, now())
    where user_low = v_low and user_high = v_high;
  end if;
end;
$$;

grant execute on function public.mark_proximity_candidate_offered(uuid) to authenticated;

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
    -- Taraflardan biri hayır dediyse kalıcı dışla (tekrar aday yok)
    and (i.low_decision is distinct from 'no')
    and (i.high_decision is distinct from 'no')
    -- Bu kişiye kart daha önce gösterildiyse tekrar gösterme
    and not (
      (i.user_low = v_me and i.low_offered_at is not null)
      or (i.user_high = v_me and i.high_offered_at is not null)
    )
    -- Ben zaten karar verdiysem (evet beklerken) tekrar gösterme
    and not (
      (i.user_low = v_me and i.low_decision is not null)
      or (i.user_high = v_me and i.high_decision is not null)
    )
  order by distance_m asc
  limit 1;
end;
$$;
