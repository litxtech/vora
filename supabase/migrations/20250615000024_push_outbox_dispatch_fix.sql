-- Push teslimatı: vault URL yedegi, outbox dispatch birlestirme, bildirim kutusu kategorisi

create or replace function public.resolve_outbox_dispatch_credentials(
  out p_url text,
  out p_key text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  select decrypted_secret into p_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret into p_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if p_url is null then
    select nullif(value ->> 'url', '')
    into p_url
    from public.app_system_config
    where key = 'outbox_dispatch'
    limit 1;
  end if;

  if p_key is null then
    select nullif(value ->> 'service_role_key', '')
    into p_key
    from public.app_system_config
    where key = 'outbox_dispatch'
    limit 1;
  end if;
end;
$$;

create or replace function public.invoke_process_notification_outbox(
  p_outbox_id uuid default null,
  p_batch_size int default 25
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  select * into v_url, v_key from public.resolve_outbox_dispatch_credentials();

  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/process-notification-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := case
      when p_outbox_id is null then jsonb_build_object('batch_size', greatest(p_batch_size, 1))
      else jsonb_build_object('outbox_id', p_outbox_id, 'batch_size', 1)
    end
  );
end;
$$;

create or replace function public.dispatch_outbox_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.invoke_process_notification_outbox(new.id, 1);
  return new;
end;
$$;

create or replace function public.process_pending_notification_outbox()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending int;
begin
  select count(*)::int
  into v_pending
  from public.notification_outbox
  where processed_at is null;

  if v_pending = 0 then
    return;
  end if;

  perform public.invoke_process_notification_outbox(null, 50);
end;
$$;

insert into public.app_system_config (key, value)
values (
  'outbox_dispatch',
  jsonb_build_object('url', 'https://rojrsetndxvwsrbriuov.supabase.co')
)
on conflict (key) do update
set value = coalesce(public.app_system_config.value, '{}'::jsonb)
  || jsonb_build_object('url', 'https://rojrsetndxvwsrbriuov.supabase.co');

do $vault$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'supabase_url'
  ) then
    perform vault.create_secret(
      'https://rojrsetndxvwsrbriuov.supabase.co',
      'supabase_url',
      'Supabase project URL — outbox push dispatch'
    );
  end if;
exception
  when others then
    raise notice 'vault supabase_url olusturulamadi; Dashboard > Vault uzerinden ekleyin: %', sqlerrm;
end;
$vault$;

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
  v_last_flush timestamptz;
  v_category public.notification_category;
  v_priority public.notification_priority;
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
  ),
  outbox_rows as (
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    select
      r.user_id,
      v_template.event_type,
      left(v_template.title, 120),
      v_body,
      jsonb_build_object(
        'region_id', p_region_id,
        'post_id', p_sample_post_id,
        'recent_post_count', greatest(p_post_count, 1),
        'template_id', v_template.id,
        'template_slug', v_template.slug,
        'image_url', v_template.image_url,
        'deep_link', v_template.deep_link
      )
    from recipients r
    returning recipient_id
  ),
  inbox_rows as (
    insert into public.notifications (user_id, event_type, title, body, data, category, priority)
    select
      r.user_id,
      v_template.event_type,
      left(v_template.title, 120),
      v_body,
      jsonb_build_object(
        'region_id', p_region_id,
        'post_id', p_sample_post_id,
        'recent_post_count', greatest(p_post_count, 1),
        'template_id', v_template.id,
        'template_slug', v_template.slug,
        'image_url', v_template.image_url,
        'deep_link', v_template.deep_link
      ),
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

  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  values (
    v_user_id,
    v_template.event_type,
    left(v_template.title, 120),
    v_body,
    jsonb_build_object(
      'template_id', v_template.id,
      'template_slug', v_template.slug,
      'image_url', v_template.image_url,
      'deep_link', v_template.deep_link,
      'is_test', true
    )
  );

  insert into public.notifications (user_id, event_type, title, body, data, category, priority)
  values (
    v_user_id,
    v_template.event_type,
    left(v_template.title, 120),
    v_body,
    jsonb_build_object(
      'template_id', v_template.id,
      'template_slug', v_template.slug,
      'image_url', v_template.image_url,
      'deep_link', v_template.deep_link,
      'is_test', true
    ),
    v_category,
    'normal'::public.notification_priority
  );

  return 1;
end;
$$;

grant execute on function public.resolve_outbox_dispatch_credentials() to service_role;
grant execute on function public.invoke_process_notification_outbox(uuid, int) to service_role;
