-- Admin: video çekimi için son eşleşilen kullanıcıyla yakınlık provası

create or replace function public.admin_prepare_proximity_match_rehearsal(
  p_latitude double precision,
  p_longitude double precision,
  p_region_id text default 'trabzon'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_low uuid;
  v_high uuid;
  v_other_username text;
  v_other_full_name text;
  v_offset_lat double precision := 0.00015;
begin
  if v_me is null then
    raise exception 'Oturum gerekli';
  end if;

  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_latitude is null or p_longitude is null then
    raise exception 'Konum gerekli';
  end if;

  select
    case when i.user_low = v_me then i.user_high else i.user_low end,
    case when i.user_low = v_me then p_high.username else p_low.username end,
    case when i.user_low = v_me then p_high.full_name else p_low.full_name end
  into v_other, v_other_username, v_other_full_name
  from public.proximity_match_interactions i
  inner join public.profiles p_low on p_low.id = i.user_low
  inner join public.profiles p_high on p_high.id = i.user_high
  where i.matched_at is not null
    and v_me in (i.user_low, i.user_high)
  order by i.matched_at desc
  limit 1;

  if v_other is null then
    raise exception 'Önceki eşleşme bulunamadı';
  end if;

  select user_low, user_high into v_low, v_high
  from public._proximity_pair_ids(v_me, v_other);

  delete from public.proximity_match_interactions
  where user_low = v_low and user_high = v_high;

  insert into public.proximity_match_presence (
    user_id, region_id, latitude, longitude, updated_at
  )
  values (
    v_me, p_region_id, p_latitude, p_longitude, now()
  )
  on conflict (user_id) do update set
    region_id = excluded.region_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();

  insert into public.proximity_match_presence (
    user_id, region_id, latitude, longitude, updated_at
  )
  values (
    v_other,
    p_region_id,
    p_latitude + v_offset_lat,
    p_longitude,
    now()
  )
  on conflict (user_id) do update set
    region_id = excluded.region_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'other_user_id', v_other,
    'other_username', v_other_username,
    'other_full_name', v_other_full_name,
    'distance_m_approx', round(v_offset_lat * 111000)::integer
  );
end;
$$;

grant execute on function public.admin_prepare_proximity_match_rehearsal(double precision, double precision, text)
  to authenticated;
