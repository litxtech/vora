-- Acil çağır — usta kabul + talep köprüsü

alter type public.notification_event_type add value if not exists 'vora_service_emergency_matched';

create or replace function public.accept_vora_emergency_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.vora_service_emergency_sessions%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_request_id uuid;
  v_offer_id uuid;
  v_title text;
  v_data jsonb;
begin
  select * into v_session
  from public.vora_service_emergency_sessions
  where id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Oturum bulunamadı');
  end if;

  if v_session.expires_at <= now() then
    return jsonb_build_object('error', 'Acil çağrı süresi doldu');
  end if;

  if v_session.matched_provider_id is not null then
    return jsonb_build_object('error', 'Başka bir usta zaten kabul etti');
  end if;

  select * into v_provider
  from public.vora_service_providers
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('error', 'Aktif usta profili gerekli');
  end if;

  if v_provider.user_id = v_session.requester_id then
    return jsonb_build_object('error', 'Kendi çağrınızı kabul edemezsiniz');
  end if;

  v_title := 'Acil ' || public.vora_service_category_label(v_session.category);

  if v_session.request_id is not null then
    v_request_id := v_session.request_id;
  else
    insert into public.vora_service_requests (
      requester_id,
      region_id,
      city,
      title,
      description,
      category,
      urgency,
      status,
      is_emergency
    )
    values (
      v_session.requester_id,
      v_session.region_id,
      v_session.city,
      v_title,
      'Acil çağrı üzerinden oluşturuldu. Usta ile mesajlaşıp ödeme adımına geçin.',
      v_session.category,
      'now',
      'offer_accepted',
      true
    )
    returning id into v_request_id;

    if v_session.latitude is not null and v_session.longitude is not null then
      perform public.set_vora_service_request_location(
        v_request_id,
        v_session.longitude,
        v_session.latitude
      );
    end if;

    insert into public.vora_service_offers (
      request_id,
      provider_id,
      price,
      message,
      status
    )
    values (
      v_request_id,
      v_provider.id,
      1,
      'Acil çağrıyı kabul ettim — fiyatı mesajla netleştirebiliriz.',
      'accepted'
    )
    returning id into v_offer_id;

    update public.vora_service_requests
    set
      accepted_offer_id = v_offer_id,
      accepted_provider_id = v_provider.id,
      updated_at = now()
    where id = v_request_id;
  end if;

  update public.vora_service_emergency_sessions
  set
    matched_provider_id = v_provider.id,
    matched_at = now(),
    request_id = v_request_id
  where id = p_session_id;

  insert into public.vora_service_status_log (request_id, status, note)
  values (v_request_id, 'offer_accepted', v_provider.display_name || ' acil çağrıyı kabul etti');

  v_data := jsonb_build_object(
    'emergency_session_id', p_session_id,
    'request_id', v_request_id,
    'provider_id', v_provider.id,
    'deep_link', '/detail/vora-hizmetler/request/' || v_request_id::text
  );

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_session.requester_id,
      'vora_service_emergency_matched',
      'Usta yolda',
      v_provider.display_name || ' acil çağrınızı kabul etti.',
      v_data,
      v_provider.user_id
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_session.requester_id,
      'vora_service_emergency_matched',
      'Acil usta bulundu',
      v_provider.display_name || ' çağrınızı kabul etti — detaydan ödeme yapabilirsiniz.',
      v_data,
      v_provider.user_id,
      'jobs',
      'high'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'provider_name', v_provider.display_name
  );
end;
$$;

grant execute on function public.accept_vora_emergency_session(uuid) to authenticated;

create or replace function public.fetch_vora_emergency_session(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.vora_service_emergency_sessions%rowtype;
  v_provider_name text;
begin
  select * into v_session
  from public.vora_service_emergency_sessions
  where id = p_session_id;

  if not found then
    return jsonb_build_object('error', 'Oturum bulunamadı');
  end if;

  if v_session.requester_id <> auth.uid()
    and not exists (
      select 1 from public.vora_service_providers
      where id = v_session.matched_provider_id and user_id = auth.uid()
    )
    and v_session.matched_provider_id is null
    and not public.is_moderator()
  then
    return jsonb_build_object('error', 'Erişim yok');
  end if;

  if v_session.matched_provider_id is not null then
    select display_name into v_provider_name
    from public.vora_service_providers
    where id = v_session.matched_provider_id;
  end if;

  return jsonb_build_object(
    'id', v_session.id,
    'category', v_session.category,
    'requester_id', v_session.requester_id,
    'matched_provider_id', v_session.matched_provider_id,
    'matched_provider_name', v_provider_name,
    'matched_at', v_session.matched_at,
    'request_id', v_session.request_id,
    'expires_at', v_session.expires_at,
    'is_expired', v_session.expires_at <= now()
  );
end;
$$;

grant execute on function public.fetch_vora_emergency_session(uuid) to authenticated;

-- Provider respond deep link in push data
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
      'deep_link', '/vora-hizmetler/emergency/respond/' || new.id::text
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
      and exists (
        select 1 from public.vora_service_providers sp
        where sp.user_id = p.id and sp.is_active = true
      )
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
      'deep_link', '/vora-hizmetler/emergency/respond/' || new.id::text
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
      and exists (
        select 1 from public.vora_service_providers sp
        where sp.user_id = p.id and sp.is_active = true
      )
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

-- Realtime acil oturum
do $$
begin
  alter publication supabase_realtime add table public.vora_service_emergency_sessions;
exception
  when duplicate_object then null;
  when others then
    raise notice 'realtime emergency_sessions: %', sqlerrm;
end;
$$;
