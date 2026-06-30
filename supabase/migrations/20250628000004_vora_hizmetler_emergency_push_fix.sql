-- Acil çağır push: inbox kaydı, esnek bölge/geo eşleşme, yedek dispatch RPC

create or replace function public.notify_vora_service_emergency_call()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_category_label text;
  v_city text;
  v_data jsonb;
  v_push_title text;
  v_push_body text;
  v_max int;
  v_radius_m double precision;
  v_point geography;
begin
  if tg_op <> 'INSERT' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  v_category_label := public.vora_service_category_label(new.category);
  v_city := coalesce(new.city, (select name from public.regions where id = new.region_id limit 1), 'Yakınınız');

  v_push_title := 'Acil ' || v_category_label || ' çağrısı';
  v_push_body := v_city || ' · Hemen yanıt verin';

  v_data := jsonb_build_object(
    'emergency_session_id', new.id,
    'category', new.category,
    'region_id', new.region_id,
    'city', new.city,
    'deep_link', '/vora-hizmetler/emergency'
  );

  select coalesce((value->>'max_recipients')::int, 150) into v_max
  from public.app_system_config where key = 'vora_hizmetler_push';

  -- Acil çağrıda biraz daha geniş yarıçap (km → m)
  select coalesce((value->>'nearby_radius_km')::double precision, 25) * 1000 into v_radius_m
  from public.app_system_config where key = 'vora_hizmetler_push';

  if new.latitude is not null and new.longitude is not null then
    v_point := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_emergency_call'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (
      new.region_id is null
      or sp.region_id is null
      or sp.region_id = new.region_id
    )
    and (
      v_point is null
      or sp.location is null
      or st_dwithin(sp.location, v_point, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_emergency_call'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id,
    'jobs'::public.notification_category,
    'high'::public.notification_priority
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (
      new.region_id is null
      or sp.region_id is null
      or sp.region_id = new.region_id
    )
    and (
      v_point is null
      or sp.location is null
      or st_dwithin(sp.location, v_point, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max;

  return new;
end;
$$;

-- Talep yayınlama: bölge eşleşmesini acil çağrı ile hizala
create or replace function public.notify_vora_service_request_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_city text;
  v_category_label text;
  v_push_title text;
  v_push_body text;
  v_max_recipients int;
  v_radius_m double precision;
  v_data jsonb;
begin
  if tg_op <> 'INSERT' then return new; end if;
  if new.status <> 'pending_offers' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  v_city := coalesce(new.city, (select name from public.regions where id = new.region_id limit 1), 'Bölgeniz');
  v_category_label := public.vora_service_category_label(new.category);

  v_push_title := case when new.is_emergency then 'Acil · ' else '' end
    || v_city || '''da ' || v_category_label || ' işi';

  v_push_body := left(new.title, 120);

  v_data := jsonb_build_object(
    'service_request_id', new.id,
    'request_id', new.id,
    'region_id', new.region_id,
    'city', new.city,
    'category', new.category,
    'is_emergency', new.is_emergency,
    'need_title', new.title,
    'deep_link', '/detail/vora-hizmetler/request/' || new.id::text
  );

  select coalesce((value->>'max_recipients')::int, 150) into v_max_recipients
  from public.app_system_config where key = 'vora_hizmetler_push';

  select coalesce((value->>'nearby_radius_km')::double precision, 15) * 1000 into v_radius_m
  from public.app_system_config where key = 'vora_hizmetler_push';

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_request_published'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (
      new.region_id is null
      or sp.region_id is null
      or sp.region_id = new.region_id
    )
    and (
      new.location is null
      or sp.location is null
      or st_dwithin(sp.location, new.location, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max_recipients;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_request_published'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id,
    'jobs'::public.notification_category,
    case when new.is_emergency then 'high'::public.notification_priority else 'normal'::public.notification_priority end
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (
      new.region_id is null
      or sp.region_id is null
      or sp.region_id = new.region_id
    )
    and (
      new.location is null
      or sp.location is null
      or st_dwithin(sp.location, new.location, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max_recipients;

  return new;
end;
$$;

create or replace function public.count_vora_emergency_notifications(p_session_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.notification_outbox
  where event_type = 'vora_service_emergency_call'
    and data->>'emergency_session_id' = p_session_id::text;
$$;

create or replace function public.dispatch_vora_emergency_push(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox_id uuid;
begin
  if not exists (
    select 1
    from public.vora_service_emergency_sessions
    where id = p_session_id
      and requester_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  for v_outbox_id in
    select id
    from public.notification_outbox
    where event_type = 'vora_service_emergency_call'
      and data->>'emergency_session_id' = p_session_id::text
      and processed_at is null
  loop
    perform public.invoke_process_notification_outbox(v_outbox_id, 1);
  end loop;
end;
$$;

grant execute on function public.count_vora_emergency_notifications(uuid) to authenticated;
grant execute on function public.dispatch_vora_emergency_push(uuid) to authenticated;
