-- Acil çağır: tüm bölge kullanıcılarına bildirim, push'ta yaklaşık km (tam konum yok)

insert into public.app_system_config (key, value)
values (
  'vora_hizmetler_push',
  jsonb_build_object(
    'enabled', true,
    'max_recipients', 150,
    'nearby_radius_km', 15,
    'emergency_max_recipients', 500,
    'emergency_radius_km', 30
  )
)
on conflict (key) do update
set value = coalesce(public.app_system_config.value, '{}'::jsonb)
  || excluded.value;

create or replace function public.bucket_approx_km(p_meters double precision)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_meters is null then null
    when p_meters <= 1000 then 1
    when p_meters <= 2000 then 2
    when p_meters <= 3000 then 3
    when p_meters <= 5000 then 5
    when p_meters <= 10000 then 10
    when p_meters <= 15000 then 15
    when p_meters <= 20000 then 20
    else 25
  end;
$$;

create or replace function public.notify_vora_service_emergency_call()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_category_label text;
  v_region_label text;
  v_push_title text;
  v_max int;
  v_radius_m double precision;
  v_point geography;
begin
  if tg_op <> 'INSERT' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  v_category_label := public.vora_service_category_label(new.category);
  v_region_label := coalesce(
    (select name from public.regions where id = new.region_id limit 1),
    new.city,
    'Bölgeniz'
  );

  v_push_title := 'Acil ' || v_category_label || ' çağrısı';

  select coalesce((value->>'emergency_max_recipients')::int, 500) into v_max
  from public.app_system_config where key = 'vora_hizmetler_push';

  select coalesce((value->>'emergency_radius_km')::double precision, 30) * 1000 into v_radius_m
  from public.app_system_config where key = 'vora_hizmetler_push';

  if new.latitude is not null and new.longitude is not null then
    v_point := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    r.user_id,
    'vora_service_emergency_call'::public.notification_event_type,
    v_push_title,
    case
      when r.approx_km is not null then
        'Yaklaşık ' || r.approx_km || ' km · ' || v_category_label || ' · Hemen yanıt verin'
      else
        v_region_label || ' · ' || v_category_label || ' · Hemen yanıt verin'
    end,
    jsonb_build_object(
      'emergency_session_id', new.id,
      'category', new.category,
      'region_id', new.region_id,
      'approx_distance_km', r.approx_km,
      'deep_link', '/vora-hizmetler/emergency'
    ),
    new.requester_id
  from (
    select distinct on (p.id)
      p.id as user_id,
      case
        when v_point is not null and rloc.loc is not null then
          public.bucket_approx_km(st_distance(v_point, rloc.loc))
        else null
      end as approx_km,
      case
        when v_point is not null and rloc.loc is not null then st_distance(v_point, rloc.loc)
        else null
      end as distance_m
    from public.profiles p
    left join lateral (
      select coalesce(
        (
          select pmp.location
          from public.proximity_match_presence pmp
          where pmp.user_id = p.id
            and pmp.updated_at > now() - interval '24 hours'
          order by pmp.updated_at desc
          limit 1
        ),
        (
          select sp.location
          from public.vora_service_providers sp
          where sp.user_id = p.id
            and sp.is_active = true
            and sp.location is not null
          limit 1
        )
      ) as loc
    ) rloc on true
    where p.id <> new.requester_id
      and coalesce(p.account_status, 'active') = 'active'
      and coalesce((p.notification_prefs->>'vora_hizmetler')::boolean, true) = true
      and (
        (new.region_id is not null and p.region_id = new.region_id)
        or (
          v_point is not null
          and rloc.loc is not null
          and st_dwithin(rloc.loc, v_point, v_radius_m)
        )
      )
    order by p.id, distance_m asc nulls last
  ) r
  order by r.distance_m asc nulls last
  limit v_max;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  select
    r.user_id,
    'vora_service_emergency_call'::public.notification_event_type,
    v_push_title,
    case
      when r.approx_km is not null then
        'Yaklaşık ' || r.approx_km || ' km · ' || v_category_label || ' · Hemen yanıt verin'
      else
        v_region_label || ' · ' || v_category_label || ' · Hemen yanıt verin'
    end,
    jsonb_build_object(
      'emergency_session_id', new.id,
      'category', new.category,
      'region_id', new.region_id,
      'approx_distance_km', r.approx_km,
      'deep_link', '/vora-hizmetler/emergency'
    ),
    new.requester_id,
    'jobs'::public.notification_category,
    'high'::public.notification_priority
  from (
    select distinct on (p.id)
      p.id as user_id,
      case
        when v_point is not null and rloc.loc is not null then
          public.bucket_approx_km(st_distance(v_point, rloc.loc))
        else null
      end as approx_km,
      case
        when v_point is not null and rloc.loc is not null then st_distance(v_point, rloc.loc)
        else null
      end as distance_m
    from public.profiles p
    left join lateral (
      select coalesce(
        (
          select pmp.location
          from public.proximity_match_presence pmp
          where pmp.user_id = p.id
            and pmp.updated_at > now() - interval '24 hours'
          order by pmp.updated_at desc
          limit 1
        ),
        (
          select sp.location
          from public.vora_service_providers sp
          where sp.user_id = p.id
            and sp.is_active = true
            and sp.location is not null
          limit 1
        )
      ) as loc
    ) rloc on true
    where p.id <> new.requester_id
      and coalesce(p.account_status, 'active') = 'active'
      and coalesce((p.notification_prefs->>'vora_hizmetler')::boolean, true) = true
      and (
        (new.region_id is not null and p.region_id = new.region_id)
        or (
          v_point is not null
          and rloc.loc is not null
          and st_dwithin(rloc.loc, v_point, v_radius_m)
        )
      )
    order by p.id, distance_m asc nulls last
  ) r
  order by r.distance_m asc nulls last
  limit v_max;

  return new;
end;
$$;
