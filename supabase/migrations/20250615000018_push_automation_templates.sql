-- Admin yönetimli otomatik push şablonları (CRUD, zamanlama, önizleme görseli)

create table if not exists public.push_automation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  enabled boolean not null default false,
  trigger_type text not null default 'feed_activity'
    check (trigger_type in ('feed_activity', 'interval', 'manual')),
  event_type public.notification_event_type not null default 'feed_activity',
  title text not null,
  body text not null,
  image_url text,
  deep_link text not null default '/(tabs)',
  region_ids text[],
  min_posts_in_window int not null default 2
    check (min_posts_in_window >= 1 and min_posts_in_window <= 100),
  activity_window_minutes int not null default 30
    check (activity_window_minutes >= 5 and activity_window_minutes <= 1440),
  user_cooldown_hours int not null default 90
    check (user_cooldown_hours >= 1 and user_cooldown_hours <= 720),
  region_cooldown_minutes int not null default 45
    check (region_cooldown_minutes >= 5 and region_cooldown_minutes <= 1440),
  interval_hours numeric(8, 2)
    check (interval_hours is null or (interval_hours >= 0.25 and interval_hours <= 8760)),
  interval_days numeric(8, 2)
    check (interval_days is null or (interval_days >= 0.04 and interval_days <= 365)),
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_recipients int not null default 0,
  sort_order int not null default 0,
  pref_key text not null default 'feed',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_automation_templates_interval_check check (
    trigger_type <> 'interval'
    or coalesce(interval_hours, 0) > 0
    or coalesce(interval_days, 0) > 0
  )
);

create index if not exists push_automation_templates_enabled_idx
  on public.push_automation_templates (enabled, trigger_type, sort_order);

create table if not exists public.push_automation_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.push_automation_templates (id) on delete set null,
  status text not null check (status in ('completed', 'failed', 'skipped')),
  recipients_count int not null default 0,
  region_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists push_automation_runs_template_idx
  on public.push_automation_runs (template_id, created_at desc);

create table if not exists public.push_template_user_cooldown (
  template_id uuid not null references public.push_automation_templates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_sent_at timestamptz not null default now(),
  primary key (template_id, user_id)
);

create table if not exists public.push_template_region_flush (
  template_id uuid not null references public.push_automation_templates (id) on delete cascade,
  region_id text not null references public.regions (id),
  last_flush_at timestamptz not null default now(),
  primary key (template_id, region_id)
);

-- Eski feed_activity cooldown tablolarından veri taşı (varsa)
do $migrate$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'feed_activity_push_cooldown'
  ) then
    insert into public.push_template_user_cooldown (template_id, user_id, last_sent_at)
    select t.id, c.user_id, c.last_sent_at
    from public.feed_activity_push_cooldown c
    cross join public.push_automation_templates t
    where t.slug = 'feed-vora-live'
    on conflict do nothing;
  end if;
end;
$migrate$;

drop table if exists public.feed_activity_push_cooldown;
drop table if exists public.feed_activity_region_flush;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'push-template-images',
  'push-template-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Push şablon görselleri herkese açık" on storage.objects;
create policy "Push şablon görselleri herkese açık"
on storage.objects for select
using (bucket_id = 'push-template-images');

drop policy if exists "Admin push şablon görseli yükleyebilir" on storage.objects;
create policy "Admin push şablon görseli yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'push-template-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Admin push şablon görseli güncelleyebilir" on storage.objects;
create policy "Admin push şablon görseli güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'push-template-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Admin push şablon görseli silebilir" on storage.objects;
create policy "Admin push şablon görseli silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'push-template-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

alter table public.push_automation_templates enable row level security;
alter table public.push_automation_runs enable row level security;

drop policy if exists push_automation_templates_admin_read on public.push_automation_templates;
create policy push_automation_templates_admin_read on public.push_automation_templates
  for select using (public.is_moderator());

drop policy if exists push_automation_templates_admin_write on public.push_automation_templates;
create policy push_automation_templates_admin_write on public.push_automation_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists push_automation_runs_admin_read on public.push_automation_runs;
create policy push_automation_runs_admin_read on public.push_automation_runs
  for select using (public.is_moderator());

create trigger push_automation_templates_updated_at
  before update on public.push_automation_templates
  for each row execute function public.set_updated_at();

insert into public.push_automation_templates (
  name,
  slug,
  enabled,
  trigger_type,
  event_type,
  title,
  body,
  min_posts_in_window,
  activity_window_minutes,
  user_cooldown_hours,
  region_cooldown_minutes,
  sort_order,
  pref_key
)
values (
  'Vora Canlı Akış',
  'feed-vora-live',
  true,
  'feed_activity',
  'feed_activity',
  'Vora çok canlı 🔥',
  'Vora çok canlı — hemen bak, yeni paylaşımlar var!',
  2,
  30,
  90,
  45,
  0,
  'feed'
)
on conflict (slug) do nothing;

create or replace function public.render_push_template_body(
  p_body text,
  p_post_count int default 1,
  p_region_id text default null
)
returns text
language plpgsql
immutable
as $$
declare
  v_region_name text;
  v_result text;
begin
  v_result := coalesce(p_body, '');
  v_region_name := coalesce(
    (select r.name from public.regions r where r.id = p_region_id),
    p_region_id,
    'bölgen'
  );

  v_result := replace(v_result, '{{post_count}}', greatest(p_post_count, 1)::text);
  v_result := replace(v_result, '{{region_name}}', v_region_name);

  if p_post_count <= 1 then
    v_result := replace(v_result, '{{post_count_label}}', 'yeni paylaşımlar var');
  elsif p_post_count < 5 then
    v_result := replace(v_result, '{{post_count_label}}', format('%s yeni paylaşım', p_post_count));
  else
    v_result := replace(v_result, '{{post_count_label}}', format('%s+ yeni paylaşım', p_post_count));
  end if;

  return left(v_result, 500);
end;
$$;

create or replace function public.resolve_push_automation_template(
  p_trigger_type text,
  p_region_id text default null
)
returns public.push_automation_templates
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.push_automation_templates;
begin
  select t.*
  into v_row
  from public.push_automation_templates t
  where t.enabled = true
    and t.trigger_type = p_trigger_type
    and (
      t.region_ids is null
      or cardinality(t.region_ids) = 0
      or (p_region_id is not null and p_region_id = any (t.region_ids))
    )
  order by t.sort_order asc, t.updated_at desc
  limit 1;

  return v_row;
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
  v_last_flush timestamptz;
begin
  select * into v_template
  from public.push_automation_templates
  where id = p_template_id and enabled = true;

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

create or replace function public.enqueue_regional_feed_activity(
  p_region_id text,
  p_sample_post_id uuid,
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
begin
  v_template := public.resolve_push_automation_template('feed_activity', p_region_id);

  if v_template.id is null then
    return 0;
  end if;

  return public.execute_push_automation_template(
    v_template.id,
    p_region_id,
    p_sample_post_id,
    p_post_count,
    p_force
  );
end;
$$;

create or replace function public.maybe_enqueue_feed_activity(
  p_region_id text,
  p_post_id uuid,
  p_author_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_recent_count int;
begin
  if p_region_id is null or p_post_id is null then
    return;
  end if;

  v_template := public.resolve_push_automation_template('feed_activity', p_region_id);
  if v_template.id is null then
    return;
  end if;

  select count(*)::int
  into v_recent_count
  from public.posts
  where region_id = p_region_id
    and status = 'published'
    and audience = 'public'
    and created_at > now() - make_interval(mins => v_template.activity_window_minutes);

  if v_recent_count < v_template.min_posts_in_window then
    return;
  end if;

  perform public.execute_push_automation_template(
    v_template.id,
    p_region_id,
    p_post_id,
    v_recent_count,
    false
  );
end;
$$;

create or replace function public.process_push_automation_intervals()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_region text;
  v_total int := 0;
  v_sent int;
  v_interval interval;
begin
  for v_template in
    select *
    from public.push_automation_templates
    where enabled = true
      and trigger_type = 'interval'
      and (next_run_at is null or next_run_at <= now())
  loop
    v_interval := coalesce(make_interval(hours => v_template.interval_hours), interval '0')
      + coalesce(make_interval(days => v_template.interval_days), interval '0');

    if v_interval <= interval '0' then
      continue;
    end if;

    if v_template.region_ids is null or cardinality(v_template.region_ids) = 0 then
      for v_region in select id from public.regions
      loop
        v_sent := public.execute_push_automation_template(
          v_template.id,
          v_region,
          null,
          1,
          true
        );
        v_total := v_total + v_sent;
      end loop;
    else
      foreach v_region in array v_template.region_ids
      loop
        v_sent := public.execute_push_automation_template(
          v_template.id,
          v_region,
          null,
          1,
          true
        );
        v_total := v_total + v_sent;
      end loop;
    end if;

    update public.push_automation_templates
    set next_run_at = now() + v_interval
    where id = v_template.id;
  end loop;

  return v_total;
end;
$$;

create or replace function public.admin_list_push_automation_templates(p_limit int default 50)
returns setof public.push_automation_templates
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select *
  from public.push_automation_templates
  order by sort_order asc, created_at desc
  limit greatest(1, least(p_limit, 200));
end;
$$;

create or replace function public.admin_list_push_automation_runs(
  p_template_id uuid default null,
  p_limit int default 30
)
returns setof public.push_automation_runs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select *
  from public.push_automation_runs r
  where p_template_id is null or r.template_id = p_template_id
  order by r.created_at desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

create or replace function public.admin_upsert_push_automation_template(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_slug := lower(trim(coalesce(p_payload->>'slug', '')));

  if v_slug = '' or v_slug !~ '^[a-z0-9][a-z0-9_-]{1,48}[a-z0-9]$' then
    raise exception 'Geçersiz slug (küçük harf, rakam, tire; 3-50 karakter)';
  end if;

  if v_id is null then
    insert into public.push_automation_templates (
      name, slug, enabled, trigger_type, event_type, title, body, image_url, deep_link,
      region_ids, min_posts_in_window, activity_window_minutes,
      user_cooldown_hours, region_cooldown_minutes,
      interval_hours, interval_days, next_run_at, sort_order, pref_key, metadata,
      created_by, updated_by
    )
    values (
      trim(p_payload->>'name'),
      v_slug,
      coalesce((p_payload->>'enabled')::boolean, false),
      coalesce(nullif(p_payload->>'trigger_type', ''), 'feed_activity'),
      coalesce(nullif(p_payload->>'event_type', ''), 'feed_activity')::public.notification_event_type,
      trim(p_payload->>'title'),
      trim(p_payload->>'body'),
      nullif(trim(p_payload->>'image_url'), ''),
      coalesce(nullif(trim(p_payload->>'deep_link'), ''), '/(tabs)'),
      case
        when p_payload->'region_ids' is null or jsonb_typeof(p_payload->'region_ids') <> 'array'
          or jsonb_array_length(p_payload->'region_ids') = 0 then null
        else array(select jsonb_array_elements_text(p_payload->'region_ids'))
      end,
      coalesce((p_payload->>'min_posts_in_window')::int, 2),
      coalesce((p_payload->>'activity_window_minutes')::int, 30),
      coalesce((p_payload->>'user_cooldown_hours')::int, 90),
      coalesce((p_payload->>'region_cooldown_minutes')::int, 45),
      nullif(p_payload->>'interval_hours', '')::numeric,
      nullif(p_payload->>'interval_days', '')::numeric,
      nullif(p_payload->>'next_run_at', '')::timestamptz,
      coalesce((p_payload->>'sort_order')::int, 0),
      coalesce(nullif(p_payload->>'pref_key', ''), 'feed'),
      coalesce(p_payload->'metadata', '{}'::jsonb),
      auth.uid(),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.push_automation_templates
    set
      name = trim(p_payload->>'name'),
      slug = v_slug,
      enabled = coalesce((p_payload->>'enabled')::boolean, enabled),
      trigger_type = coalesce(nullif(p_payload->>'trigger_type', ''), trigger_type),
      event_type = coalesce(nullif(p_payload->>'event_type', ''), event_type::text)::public.notification_event_type,
      title = trim(p_payload->>'title'),
      body = trim(p_payload->>'body'),
      image_url = nullif(trim(p_payload->>'image_url'), ''),
      deep_link = coalesce(nullif(trim(p_payload->>'deep_link'), ''), deep_link),
      region_ids = case
        when p_payload->'region_ids' is null or jsonb_typeof(p_payload->'region_ids') <> 'array'
          or jsonb_array_length(p_payload->'region_ids') = 0 then null
        else array(select jsonb_array_elements_text(p_payload->'region_ids'))
      end,
      min_posts_in_window = coalesce((p_payload->>'min_posts_in_window')::int, min_posts_in_window),
      activity_window_minutes = coalesce((p_payload->>'activity_window_minutes')::int, activity_window_minutes),
      user_cooldown_hours = coalesce((p_payload->>'user_cooldown_hours')::int, user_cooldown_hours),
      region_cooldown_minutes = coalesce((p_payload->>'region_cooldown_minutes')::int, region_cooldown_minutes),
      interval_hours = coalesce(nullif(p_payload->>'interval_hours', '')::numeric, interval_hours),
      interval_days = coalesce(nullif(p_payload->>'interval_days', '')::numeric, interval_days),
      next_run_at = coalesce(nullif(p_payload->>'next_run_at', '')::timestamptz, next_run_at),
      sort_order = coalesce((p_payload->>'sort_order')::int, sort_order),
      pref_key = coalesce(nullif(p_payload->>'pref_key', ''), pref_key),
      metadata = coalesce(p_payload->'metadata', metadata),
      updated_by = auth.uid()
    where id = v_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_delete_push_automation_template(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  delete from public.push_automation_templates where id = p_id;
end;
$$;

create or replace function public.admin_preview_push_automation_template(
  p_template_id uuid,
  p_region_id text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.push_automation_templates;
  v_region text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_template from public.push_automation_templates where id = p_template_id;
  if v_template.id is null then
    return 0;
  end if;

  v_region := coalesce(
    p_region_id,
    case
      when v_template.region_ids is not null and cardinality(v_template.region_ids) > 0
        then v_template.region_ids[1]
      else (select id from public.regions order by id limit 1)
    end
  );

  return (
    select count(*)::int
    from public.profiles p
    where p.account_status = 'active'
      and p.region_id = v_region
      and coalesce((p.notification_prefs->>v_template.pref_key)::boolean, true) = true
      and exists (
        select 1 from public.push_tokens pt
        where pt.user_id = p.id and pt.is_active = true
          and (pt.expo_push_token is not null or pt.device_push_token is not null)
      )
  );
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
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_template from public.push_automation_templates where id = p_template_id;
  if v_template.id is null then
    raise exception 'Şablon bulunamadı';
  end if;

  v_region := coalesce(
    p_region_id,
    case
      when v_template.region_ids is not null and cardinality(v_template.region_ids) > 0
        then v_template.region_ids[1]
      else (select id from public.regions order by id limit 1)
    end
  );

  v_count := greatest(v_template.min_posts_in_window, 1);

  v_sent := public.execute_push_automation_template(
    v_template.id,
    v_region,
    null,
    v_count,
    p_force
  );

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

  insert into public.notifications (user_id, event_type, title, body, data)
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

  return 1;
end;
$$;

grant execute on function public.admin_list_push_automation_templates(int) to authenticated;
grant execute on function public.admin_list_push_automation_runs(uuid, int) to authenticated;
grant execute on function public.admin_upsert_push_automation_template(jsonb) to authenticated;
grant execute on function public.admin_delete_push_automation_template(uuid) to authenticated;
grant execute on function public.admin_preview_push_automation_template(uuid, text) to authenticated;
grant execute on function public.admin_run_push_automation_template(uuid, text, boolean) to authenticated;
grant execute on function public.admin_test_push_automation_template(uuid) to authenticated;
grant execute on function public.process_push_automation_intervals() to service_role;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-push-automation-intervals');
  perform cron.schedule(
    'process-push-automation-intervals',
    '*/15 * * * *',
    $job$select public.process_push_automation_intervals()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; interval push manuel/edge ile çalıştırılmalı: %', sqlerrm;
end;
$cron$;

insert into public.admin_role_permissions (role, permission_key, allowed)
values
  ('moderator', 'panel.push-automation', true),
  ('admin', 'panel.push-automation', true)
on conflict (role, permission_key) do update set allowed = excluded.allowed;
