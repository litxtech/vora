-- Toplu push: hedef kitle filtreleri, zamanlanmış gönderim işlemcisi, app sürümü takibi

alter table public.push_tokens
  add column if not exists app_version text,
  add column if not exists app_build text;

alter table public.scheduled_broadcasts
  add column if not exists audience_filter jsonb not null default '{"segment":"all"}'::jsonb,
  add column if not exists recipient_count integer;

alter table public.admin_broadcasts
  add column if not exists audience_filter jsonb,
  add column if not exists scheduled_broadcast_id uuid references public.scheduled_broadcasts (id) on delete set null;

create or replace function public.parse_version_parts(p_version text)
returns integer[]
language plpgsql
immutable
as $$
declare
  v_parts text[];
  v_result integer[] := array[0, 0, 0];
  i integer;
begin
  if p_version is null or btrim(p_version) = '' then
    return v_result;
  end if;

  v_parts := string_to_array(regexp_replace(btrim(p_version), '[^0-9.].*$', ''), '.');

  for i in 1..3 loop
    if i <= coalesce(array_length(v_parts, 1), 0) and v_parts[i] ~ '^\d+$' then
      v_result[i] := v_parts[i]::integer;
    end if;
  end loop;

  return v_result;
end;
$$;

create or replace function public.app_version_lt(p_version text, p_min text)
returns boolean
language plpgsql
immutable
as $$
declare
  v1 integer[] := public.parse_version_parts(p_version);
  v2 integer[] := public.parse_version_parts(p_min);
  i integer;
begin
  for i in 1..3 loop
    if v1[i] < v2[i] then
      return true;
    end if;
    if v1[i] > v2[i] then
      return false;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.get_min_app_version_for_platform(p_platform text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(value ->> p_platform, ''),
    nullif(value ->> 'ios', ''),
    '0.0.0'
  )
  from public.app_system_config
  where key = 'min_app_version'
  limit 1;
$$;

create or replace function public.normalize_broadcast_audience(p_audience jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_segment text := coalesce(nullif(p_audience ->> 'segment', ''), 'all');
begin
  return jsonb_build_object(
    'segment', v_segment,
    'region_id', nullif(p_audience ->> 'region_id', ''),
    'role', nullif(p_audience ->> 'role', ''),
    'require_push_token', coalesce((p_audience ->> 'require_push_token')::boolean, false)
  );
end;
$$;

create or replace function public.profile_matches_broadcast_audience(
  p_profile public.profiles,
  p_audience jsonb
)
returns boolean
language plpgsql
stable
as $$
declare
  v_audience jsonb := public.normalize_broadcast_audience(p_audience);
  v_segment text := v_audience ->> 'segment';
begin
  if v_audience ? 'region_id'
    and v_audience ->> 'region_id' is not null
    and p_profile.region_id is distinct from v_audience ->> 'region_id' then
    return false;
  end if;

  if v_audience ? 'role'
    and v_audience ->> 'role' is not null
    and p_profile.role::text is distinct from v_audience ->> 'role' then
    return false;
  end if;

  if coalesce((v_audience ->> 'require_push_token')::boolean, false) then
    if not exists (
      select 1
      from public.push_tokens pt
      where pt.user_id = p_profile.id
        and pt.is_active = true
        and pt.expo_push_token is not null
    ) then
      return false;
    end if;
  end if;

  case v_segment
    when 'all' then
      return p_profile.account_status = 'active';
    when 'all_registered' then
      return p_profile.account_status <> 'deleted';
    when 'outdated_app' then
      return p_profile.account_status = 'active'
        and exists (
          select 1
          from public.push_tokens pt
          where pt.user_id = p_profile.id
            and pt.is_active = true
            and (
              pt.app_version is null
              or public.app_version_lt(
                pt.app_version,
                public.get_min_app_version_for_platform(pt.platform::text)
              )
            )
        );
    when 'banned' then
      return p_profile.account_status = 'frozen'
        or exists (
          select 1
          from public.user_bans ub
          where ub.user_id = p_profile.id
            and ub.is_active = true
            and (ub.expires_at is null or ub.expires_at > now())
        );
    when 'quarantined' then
      return p_profile.account_status = 'quarantined';
    when 'premium' then
      return p_profile.account_status = 'active' and coalesce(p_profile.is_premium, false) = true;
    when 'deletion_pending' then
      return p_profile.account_status = 'deletion_pending';
    else
      return p_profile.account_status = 'active';
  end case;
end;
$$;

create or replace function public.admin_preview_broadcast_recipients(p_audience jsonb default '{"segment":"all"}'::jsonb)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select count(*)::integer into v_count
  from public.profiles p
  where public.profile_matches_broadcast_audience(p, p_audience);

  return v_count;
end;
$$;

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
begin
  v_event := case p_type
    when 'emergency' then 'emergency'::public.notification_event_type
    else 'system'::public.notification_event_type
  end;

  for v_recipient in
    select p.id
    from public.profiles p
    where public.profile_matches_broadcast_audience(p, v_audience)
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_recipient.id,
      v_event,
      p_title,
      p_body,
      jsonb_build_object(
        'broadcast', true,
        'broadcast_type', p_type,
        'audience_segment', v_audience ->> 'segment'
      ),
      v_actor
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_recipient.id,
      v_event,
      p_title,
      p_body,
      jsonb_build_object(
        'broadcast', true,
        'broadcast_type', p_type,
        'audience_segment', v_audience ->> 'segment'
      ),
      v_actor,
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

create or replace function public.admin_send_broadcast(
  p_type public.broadcast_type,
  p_title text,
  p_body text,
  p_audience jsonb default '{"segment":"all"}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return public.send_broadcast_to_audience(p_type, p_title, p_body, p_audience, auth.uid(), null);
end;
$$;

create or replace function public.process_scheduled_broadcasts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.scheduled_broadcasts%rowtype;
  v_count integer;
  v_results jsonb := '[]'::jsonb;
begin
  for v_row in
    select *
    from public.scheduled_broadcasts
    where is_sent = false
      and is_cancelled = false
      and scheduled_at <= now()
    order by scheduled_at asc
    for update skip locked
  loop
    v_count := public.send_broadcast_to_audience(
      v_row.broadcast_type,
      v_row.title,
      v_row.body,
      v_row.audience_filter,
      v_row.created_by,
      v_row.id
    );

    update public.scheduled_broadcasts
    set
      is_sent = true,
      sent_at = now(),
      recipient_count = v_count
    where id = v_row.id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'id', v_row.id,
        'title', v_row.title,
        'recipient_count', v_count
      )
    );
  end loop;

  return jsonb_build_object('processed', jsonb_array_length(v_results), 'results', v_results);
end;
$$;

drop function if exists public.admin_preview_broadcast_recipients(text, text);
drop function if exists public.admin_send_broadcast(public.broadcast_type, text, text, text, text);

drop function if exists public.admin_list_scheduled_broadcasts(int);

create or replace function public.admin_list_scheduled_broadcasts(p_limit int default 50)
returns table (
  id uuid,
  title text,
  body text,
  broadcast_type public.broadcast_type,
  region_id text,
  audience_filter jsonb,
  scheduled_at timestamptz,
  is_sent boolean,
  is_cancelled boolean,
  recipient_count integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    sb.id,
    sb.title,
    sb.body,
    sb.broadcast_type,
    sb.region_id,
    sb.audience_filter,
    sb.scheduled_at,
    sb.is_sent,
    sb.is_cancelled,
    sb.recipient_count,
    sb.created_at
  from public.scheduled_broadcasts sb
  order by sb.scheduled_at desc
  limit p_limit;
end;
$$;

drop function if exists public.admin_create_scheduled_broadcast(text, text, public.broadcast_type, timestamptz, text);

create or replace function public.admin_create_scheduled_broadcast(
  p_title text,
  p_body text,
  p_broadcast_type public.broadcast_type,
  p_scheduled_at timestamptz,
  p_audience jsonb default '{"segment":"all"}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_audience jsonb := public.normalize_broadcast_audience(p_audience);
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'Gönderim zamanı gelecekte olmalıdır.';
  end if;

  insert into public.scheduled_broadcasts (
    created_by,
    title,
    body,
    broadcast_type,
    scheduled_at,
    region_id,
    audience_filter
  )
  values (
    auth.uid(),
    p_title,
    p_body,
    p_broadcast_type,
    p_scheduled_at,
    nullif(v_audience ->> 'region_id', ''),
    v_audience
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop function if exists public.admin_update_scheduled_broadcast(uuid, text, text, public.broadcast_type, timestamptz);

create or replace function public.admin_update_scheduled_broadcast(
  p_id uuid,
  p_title text,
  p_body text,
  p_broadcast_type public.broadcast_type,
  p_scheduled_at timestamptz,
  p_audience jsonb default '{"segment":"all"}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audience jsonb := public.normalize_broadcast_audience(p_audience);
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'Gönderim zamanı gelecekte olmalıdır.';
  end if;

  update public.scheduled_broadcasts
  set
    title = p_title,
    body = p_body,
    broadcast_type = p_broadcast_type,
    scheduled_at = p_scheduled_at,
    region_id = nullif(v_audience ->> 'region_id', ''),
    audience_filter = v_audience
  where id = p_id
    and is_sent = false
    and is_cancelled = false;

  if not found then
    raise exception 'Duyuru düzenlenemedi (gönderilmiş veya iptal edilmiş olabilir).';
  end if;
end;
$$;

grant execute on function public.admin_preview_broadcast_recipients(jsonb) to authenticated;
grant execute on function public.admin_send_broadcast(public.broadcast_type, text, text, jsonb) to authenticated;
grant execute on function public.admin_create_scheduled_broadcast(text, text, public.broadcast_type, timestamptz, jsonb) to authenticated;
grant execute on function public.admin_update_scheduled_broadcast(uuid, text, text, public.broadcast_type, timestamptz, jsonb) to authenticated;
grant execute on function public.process_scheduled_broadcasts() to service_role;

create or replace function public.admin_send_emergency(
  p_title text,
  p_body text,
  p_region_id text default null,
  p_severity public.incident_severity default 'high',
  p_expires_hours integer default 24
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  insert into public.emergency_broadcasts (sent_by, title, body, region_id, severity, expires_at)
  values (
    auth.uid(),
    p_title,
    p_body,
    p_region_id,
    p_severity,
    now() + (p_expires_hours || ' hours')::interval
  )
  returning id into v_id;

  perform public.admin_send_broadcast(
    'emergency'::public.broadcast_type,
    p_title,
    p_body,
    jsonb_build_object('segment', 'all', 'region_id', p_region_id)
  );

  return v_id;
end;
$$;

do $cron$
begin
  perform cron.unschedule('process-scheduled-broadcasts');
exception
  when others then null;
end;
$cron$;

select cron.schedule(
  'process-scheduled-broadcasts',
  '*/5 * * * *',
  $$select public.process_scheduled_broadcasts();$$
);
