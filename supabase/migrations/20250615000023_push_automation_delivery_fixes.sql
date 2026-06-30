-- Otomatik push: zorla gönderimde enabled engelini kaldır, tüm bölgeler, dakikalık cron

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
    insert into public.notifications (user_id, event_type, title, body, data)
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

create or replace function public.admin_run_push_automation_template(
  p_template_id uuid,
  p_region_id text default null,
  p_force boolean default true
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_region text;
  v_sent int := 0;
  v_count int;
  v_batch int;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_template from public.push_automation_templates where id = p_template_id;
  if v_template.id is null then
    raise exception 'Şablon bulunamadı';
  end if;

  v_count := greatest(v_template.min_posts_in_window, 1);

  if p_region_id is not null then
    return public.execute_push_automation_template(
      v_template.id,
      p_region_id,
      null,
      v_count,
      p_force
    );
  end if;

  if v_template.region_ids is not null and cardinality(v_template.region_ids) > 0 then
    foreach v_region in array v_template.region_ids
    loop
      v_batch := public.execute_push_automation_template(
        v_template.id,
        v_region,
        null,
        v_count,
        p_force
      );
      v_sent := v_sent + v_batch;
    end loop;
    return v_sent;
  end if;

  for v_region in select id from public.regions
  loop
    v_batch := public.execute_push_automation_template(
      v_template.id,
      v_region,
      null,
      v_count,
      p_force
    );
    v_sent := v_sent + v_batch;
  end loop;

  return v_sent;
end;
$$;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-push-automation-intervals');
  perform cron.schedule(
    'process-push-automation-intervals',
    '* * * * *',
    $job$select public.process_push_automation_intervals()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; push otomasyonu manuel/edge ile çalıştırılmalı: %', sqlerrm;
end;
$cron$;

-- Outbox tetikleyicisi (pg_net) kaçırırsa bekleyen push'ları dakikada bir tara
create or replace function public.process_pending_notification_outbox()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_pending int;
begin
  select count(*)::int
  into v_pending
  from public.notification_outbox
  where processed_at is null;

  if v_pending = 0 then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/process-notification-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('batch_size', 50)
  );
end;
$$;

grant execute on function public.process_pending_notification_outbox() to service_role;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-pending-notification-outbox');
  perform cron.schedule(
    'process-pending-notification-outbox',
    '* * * * *',
    $job$select public.process_pending_notification_outbox()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; outbox yedek işlemcisi kurulamadı: %', sqlerrm;
end;
$cron$;
