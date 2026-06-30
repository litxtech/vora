-- Yakınlık eşleşmesi düzeltmeleri (retry — 000006 kısmi uygulama sonrası)

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

  if v_birth is null then
    return jsonb_build_object('ok', false, 'reason', 'no_birth_date');
  end if;

  if v_birth > (current_date - interval '18 years')::date then
    return jsonb_build_object('ok', false, 'reason', 'underage');
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
    updated_at > now() - interval '5 minutes'
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
    and pmp.updated_at > now() - interval '5 minutes'
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
  v_actor_username text;
  v_other_username text;
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
    select username into v_actor_username from public.profiles where id = v_me;
    select username into v_other_username from public.profiles where id = p_other_user_id;

    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values
      (
        p_other_user_id,
        'system'::public.notification_event_type,
        'Yakınlık eşleşmesi',
        format('@%s ile eşleştiniz!', coalesce(v_actor_username, 'birisi')),
        jsonb_build_object('deep_link', '/proximity-matches', 'other_user_id', v_me::text),
        v_me
      ),
      (
        v_me,
        'system'::public.notification_event_type,
        'Yakınlık eşleşmesi',
        format('@%s ile eşleştiniz!', coalesce(v_other_username, 'birisi')),
        jsonb_build_object('deep_link', '/proximity-matches', 'other_user_id', p_other_user_id::text),
        p_other_user_id
      );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values
      (
        p_other_user_id,
        'system'::public.notification_event_type,
        'Yakınlık eşleşmesi',
        format('@%s ile eşleştiniz!', coalesce(v_actor_username, 'birisi')),
        jsonb_build_object('deep_link', '/proximity-matches', 'other_user_id', v_me::text),
        v_me,
        'social'::public.notification_category,
        'normal'::public.notification_priority
      ),
      (
        v_me,
        'system'::public.notification_event_type,
        'Yakınlık eşleşmesi',
        format('@%s ile eşleştiniz!', coalesce(v_other_username, 'birisi')),
        jsonb_build_object('deep_link', '/proximity-matches', 'other_user_id', p_other_user_id::text),
        p_other_user_id,
        'social'::public.notification_category,
        'normal'::public.notification_priority
      );

    return jsonb_build_object('status', 'matched', 'other_user_id', p_other_user_id);
  end if;

  select username into v_actor_username from public.profiles where id = v_me;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    p_other_user_id,
    'system'::public.notification_event_type,
    'Yakınlık eşleşme isteği',
    format('@%s yakınında ve sizinle eşleşmek istiyor.', coalesce(v_actor_username, 'Birisi')),
    jsonb_build_object('deep_link', '/(tabs)', 'other_user_id', v_me::text),
    v_me
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    p_other_user_id,
    'system'::public.notification_event_type,
    'Yakınlık eşleşme isteği',
    format('@%s yakınında ve sizinle eşleşmek istiyor.', coalesce(v_actor_username, 'Birisi')),
    jsonb_build_object('deep_link', '/(tabs)', 'other_user_id', v_me::text),
    v_me,
    'social'::public.notification_category,
    'normal'::public.notification_priority
  );

  return jsonb_build_object('status', 'waiting', 'other_user_id', p_other_user_id);
end;
$$;
