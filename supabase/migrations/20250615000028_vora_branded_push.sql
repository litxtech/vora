-- Toplu / otomasyon push: Vora markası (actor_id yok), admin alıcılar dahil

create or replace function public.send_broadcast_to_audience(
  p_type public.broadcast_type,
  p_title text,
  p_body text,
  p_audience jsonb default '{"segment":"all"}'::jsonb,
  p_actor_id uuid default null,
  p_scheduled_broadcast_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_event public.notification_event_type;
  v_recipient record;
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_audience jsonb := public.normalize_broadcast_audience(p_audience);
  v_data jsonb;
begin
  v_event := case p_type
    when 'emergency' then 'emergency'::public.notification_event_type
    else 'system'::public.notification_event_type
  end;

  v_data := jsonb_build_object(
    'broadcast', true,
    'broadcast_type', p_type,
    'audience_segment', v_audience ->> 'segment',
    'sender_label', 'Vora',
    'sent_by', v_actor
  );

  for v_recipient in
    select p.id
    from public.profiles p
    where public.profile_matches_broadcast_audience(p, v_audience)
      and not exists (
        select 1
        from public.notification_outbox o
        where o.recipient_id = p.id
          and o.title = p_title
          and o.body = p_body
          and o.created_at > now() - interval '10 minutes'
      )
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, v_data, null);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_recipient.id,
      v_event,
      p_title,
      p_body,
      v_data,
      null,
      case p_type
        when 'emergency' then 'emergency'::public.notification_category
        else 'system'::public.notification_category
      end,
      case p_type
        when 'emergency' then 'critical'::public.notification_priority
        else 'normal'::public.notification_priority
      end
    );

    v_count := v_count + 1;
  end loop;

  insert into public.admin_broadcasts (
    sent_by,
    broadcast_type,
    title,
    body,
    region_id,
    recipient_count,
    audience_filter,
    scheduled_broadcast_id
  )
  values (
    v_actor,
    p_type,
    p_title,
    p_body,
    nullif(v_audience ->> 'region_id', ''),
    v_count,
    v_audience,
    p_scheduled_broadcast_id
  );

  return v_count;
end;
$$;

create or replace function public.execute_push_automation_template(
  p_template_id uuid,
  p_region_id text,
  p_sample_post_id uuid default null,
  p_post_count int default 1,
  p_force boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_body text;
  v_sent int := 0;
  v_user_cooldown interval;
  v_region_cooldown interval;
  v_global_cooldown interval := interval '30 minutes';
  v_last_flush timestamptz;
  v_category public.notification_category;
  v_priority public.notification_priority;
  v_data jsonb;
begin
  select * into v_template
  from public.push_automation_templates
  where id = p_template_id
    and (enabled = true or p_force = true);

  if v_template.id is null or p_region_id is null then
    return 0;
  end if;

  if v_template.region_ids is not null
    and cardinality(v_template.region_ids) > 0
    and not (p_region_id = any (v_template.region_ids)) then
    return 0;
  end if;

  v_user_cooldown := make_interval(hours => v_template.user_cooldown_hours);
  v_region_cooldown := make_interval(mins => v_template.region_cooldown_minutes);
  v_category := public.notification_category_for(v_template.event_type);
  v_priority := case v_template.event_type
    when 'emergency' then 'critical'::public.notification_priority
    when 'security_alert' then 'high'::public.notification_priority
    else 'normal'::public.notification_priority
  end;

  select last_flush_at
  into v_last_flush
  from public.push_template_region_flush
  where template_id = v_template.id and region_id = p_region_id;

  if not p_force and v_last_flush is not null and v_last_flush > now() - v_region_cooldown then
    return 0;
  end if;

  v_body := public.render_push_template_body(v_template.body, p_post_count, p_region_id);
  v_data := jsonb_build_object(
    'region_id', p_region_id,
    'post_id', p_sample_post_id,
    'recent_post_count', greatest(p_post_count, 1),
    'template_id', v_template.id,
    'template_slug', v_template.slug,
    'image_url', v_template.image_url,
    'deep_link', v_template.deep_link,
    'sender_label', 'Vora'
  );

  with recipients as (
    select p.id as user_id
    from public.profiles p
    where p.account_status = 'active'
      and p.region_id = p_region_id
      and coalesce((p.notification_prefs->>v_template.pref_key)::boolean, true) = true
      and exists (
        select 1
        from public.push_tokens pt
        where pt.user_id = p.id
          and pt.is_active = true
          and (pt.expo_push_token is not null or pt.device_push_token is not null)
      )
      and not exists (
        select 1
        from public.push_template_user_cooldown c
        where c.template_id = v_template.id
          and c.user_id = p.id
          and c.last_sent_at > now() - v_user_cooldown
      )
      and not exists (
        select 1
        from public.push_template_user_cooldown c
        where c.user_id = p.id
          and c.last_sent_at > now() - v_global_cooldown
      )
  ),
  outbox_rows as (
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      r.user_id,
      v_template.event_type,
      left(v_template.title, 120),
      v_body,
      v_data,
      null
    from recipients r
    returning recipient_id
  ),
  inbox_rows as (
    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    select
      r.user_id,
      v_template.event_type,
      left(v_template.title, 120),
      v_body,
      v_data,
      null,
      v_category,
      v_priority
    from recipients r
    returning user_id
  ),
  cooldown_rows as (
    insert into public.push_template_user_cooldown (template_id, user_id, last_sent_at)
    select v_template.id, r.user_id, now()
    from recipients r
    on conflict (template_id, user_id) do update
      set last_sent_at = excluded.last_sent_at
    returning user_id
  )
  select count(*)::int
  into v_sent
  from outbox_rows;

  if v_sent > 0 then
    insert into public.push_template_region_flush (template_id, region_id, last_flush_at)
    values (v_template.id, p_region_id, now())
    on conflict (template_id, region_id) do update
      set last_flush_at = excluded.last_flush_at;

    update public.push_automation_templates
    set last_run_at = now(),
        last_run_recipients = v_sent
    where id = v_template.id;

    insert into public.push_automation_runs (template_id, status, recipients_count, region_id, details)
    values (
      v_template.id,
      'completed',
      v_sent,
      p_region_id,
      jsonb_build_object('post_count', p_post_count, 'forced', p_force)
    );
  end if;

  return v_sent;
end;
$$;

create or replace function public.admin_test_push_automation_template(p_template_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_user_id uuid := auth.uid();
  v_body text;
  v_region text;
  v_category public.notification_category;
  v_data jsonb;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_template from public.push_automation_templates where id = p_template_id;
  if v_template.id is null then
    raise exception 'Şablon bulunamadı';
  end if;

  select region_id into v_region from public.profiles where id = v_user_id;
  v_body := public.render_push_template_body(v_template.body, 3, v_region);
  v_category := public.notification_category_for(v_template.event_type);
  v_data := jsonb_build_object(
    'template_id', v_template.id,
    'template_slug', v_template.slug,
    'image_url', v_template.image_url,
    'deep_link', v_template.deep_link,
    'is_test', true,
    'sender_label', 'Vora'
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_user_id,
    v_template.event_type,
    left(v_template.title, 120),
    v_body,
    v_data,
    null
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_user_id,
    v_template.event_type,
    left(v_template.title, 120),
    v_body,
    v_data,
    null,
    v_category,
    'normal'::public.notification_priority
  );

  return 1;
end;
$$;
