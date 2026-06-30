-- Otel pazarlama kampanyaları — admin platform geneli tanıtım

alter type public.notification_event_type add value if not exists 'hotel_marketing_campaign';

create type public.hotel_marketing_campaign_type as enum (
  'weekend_youth',
  'event',
  'seasonal',
  'student_deal',
  'custom'
);

create table public.hotel_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotel_listings (id) on delete cascade,
  campaign_type public.hotel_marketing_campaign_type not null default 'custom',
  headline text not null,
  message text not null,
  region_scope text not null default 'platform' check (region_scope in ('platform', 'region')),
  region_id text references public.regions (id) on delete set null,
  priority smallint not null default 0,
  platform_wide boolean not null default true,
  notify_users boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hotel_marketing_headline_len check (char_length(trim(headline)) between 2 and 48),
  constraint hotel_marketing_message_len check (char_length(trim(message)) between 4 and 160),
  constraint hotel_marketing_region_scope_check check (
    (region_scope = 'platform' and region_id is null)
    or (region_scope = 'region' and region_id is not null)
  )
);

create index hotel_marketing_active_idx
  on public.hotel_marketing_campaigns (is_active, starts_at desc, priority desc)
  where is_active = true;

create index hotel_marketing_hotel_idx
  on public.hotel_marketing_campaigns (hotel_id, created_at desc);

create or replace function public.sync_hotel_listing_featured_from_campaigns(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hotel_listings h
  set
    is_featured = exists (
      select 1
      from public.hotel_marketing_campaigns c
      where c.hotel_id = p_hotel_id
        and c.is_active = true
        and c.starts_at <= now()
        and (c.ends_at is null or c.ends_at > now())
    ),
    updated_at = now()
  where h.id = p_hotel_id;
end;
$$;

create or replace function public.get_active_hotel_marketing_campaigns(p_region_id text default null)
returns table (
  campaign_id uuid,
  hotel_id uuid,
  campaign_type public.hotel_marketing_campaign_type,
  headline text,
  message text,
  priority smallint,
  platform_wide boolean,
  hotel_name text,
  cover_url text,
  region_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.hotel_id,
    c.campaign_type,
    c.headline,
    c.message,
    c.priority,
    c.platform_wide,
    h.name,
    h.cover_url,
    h.region_id
  from public.hotel_marketing_campaigns c
  join public.hotel_listings h on h.id = c.hotel_id and h.status = 'published'
  where c.is_active = true
    and c.starts_at <= now()
    and (c.ends_at is null or c.ends_at > now())
    and (
      c.region_scope = 'platform'
      or (c.region_scope = 'region' and c.region_id = p_region_id)
    )
  order by c.priority desc, c.created_at desc;
$$;

create or replace function public.admin_search_hotels_for_marketing(
  p_query text default '',
  p_limit int default 20
)
returns table (
  id uuid,
  name text,
  region_id text,
  district text,
  cover_url text,
  status public.hotel_listing_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    h.id,
    h.name,
    h.region_id,
    h.district,
    h.cover_url,
    h.status
  from public.hotel_listings h
  where h.status = 'published'
    and (
      nullif(trim(p_query), '') is null
      or h.name ilike '%' || trim(p_query) || '%'
      or coalesce(h.district, '') ilike '%' || trim(p_query) || '%'
    )
  order by h.is_featured desc, h.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

create or replace function public.admin_list_hotel_marketing_campaigns(p_limit int default 50)
returns table (
  id uuid,
  hotel_id uuid,
  hotel_name text,
  hotel_cover_url text,
  campaign_type public.hotel_marketing_campaign_type,
  headline text,
  message text,
  region_scope text,
  region_id text,
  priority smallint,
  platform_wide boolean,
  notify_users boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    c.id,
    c.hotel_id,
    h.name,
    h.cover_url,
    c.campaign_type,
    c.headline,
    c.message,
    c.region_scope,
    c.region_id,
    c.priority,
    c.platform_wide,
    c.notify_users,
    c.starts_at,
    c.ends_at,
    c.is_active,
    c.created_at
  from public.hotel_marketing_campaigns c
  join public.hotel_listings h on h.id = c.hotel_id
  order by c.is_active desc, c.priority desc, c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create or replace function public.admin_create_hotel_marketing_campaign(
  p_hotel_id uuid,
  p_campaign_type public.hotel_marketing_campaign_type,
  p_headline text,
  p_message text,
  p_region_scope text default 'platform',
  p_region_id text default null,
  p_priority smallint default 0,
  p_platform_wide boolean default true,
  p_notify_users boolean default false,
  p_days int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_hotel public.hotel_listings%rowtype;
  v_ends timestamptz;
  v_title text;
  v_body text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_hotel
  from public.hotel_listings
  where id = p_hotel_id and status = 'published';

  if not found then
    raise exception 'Yayında otel bulunamadı';
  end if;

  if p_region_scope = 'region' and p_region_id is null then
    raise exception 'Bölgesel kampanya için bölge seçin';
  end if;

  if p_days is not null and p_days > 0 then
    v_ends := now() + (p_days || ' days')::interval;
  end if;

  insert into public.hotel_marketing_campaigns (
    hotel_id, campaign_type, headline, message,
    region_scope, region_id, priority, platform_wide, notify_users,
    starts_at, ends_at, created_by
  ) values (
    p_hotel_id, p_campaign_type, trim(p_headline), trim(p_message),
    coalesce(p_region_scope, 'platform'),
    case when coalesce(p_region_scope, 'platform') = 'region' then p_region_id else null end,
    greatest(0, coalesce(p_priority, 0)),
    coalesce(p_platform_wide, true),
    coalesce(p_notify_users, false),
    now(), v_ends, auth.uid()
  )
  returning id into v_id;

  perform public.sync_hotel_listing_featured_from_campaigns(p_hotel_id);

  if coalesce(p_notify_users, false) then
    v_title := trim(p_headline);
    v_body := left(trim(p_message) || ' · ' || v_hotel.name, 180);

    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      p.id,
      'hotel_marketing_campaign'::public.notification_event_type,
      v_title,
      v_body,
      jsonb_build_object(
        'hotel_id', p_hotel_id,
        'campaign_id', v_id,
        'deep_link', '/detail/hotels/' || p_hotel_id::text,
        'headline', trim(p_headline)
      ),
      auth.uid()
    from public.profiles p
    where coalesce((p.notification_prefs->>'hotels')::boolean, true)
      and (
        coalesce(p_region_scope, 'platform') = 'platform'
        or p.region_id = p_region_id
      );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    select
      p.id,
      'hotel_marketing_campaign'::public.notification_event_type,
      v_title,
      v_body,
      jsonb_build_object(
        'hotel_id', p_hotel_id,
        'campaign_id', v_id,
        'deep_link', '/detail/hotels/' || p_hotel_id::text,
        'headline', trim(p_headline)
      ),
      auth.uid(),
      'businesses'::public.notification_category,
      'normal'::public.notification_priority
    from public.profiles p
    where coalesce((p.notification_prefs->>'hotels')::boolean, true)
      and (
        coalesce(p_region_scope, 'platform') = 'platform'
        or p.region_id = p_region_id
      );
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_end_hotel_marketing_campaign(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.hotel_marketing_campaigns
  set is_active = false, ends_at = coalesce(ends_at, now()), updated_at = now()
  where id = p_campaign_id
  returning hotel_id into v_hotel_id;

  if not found then return false; end if;

  perform public.sync_hotel_listing_featured_from_campaigns(v_hotel_id);
  return true;
end;
$$;

alter table public.hotel_marketing_campaigns enable row level security;

create policy hotel_marketing_campaigns_read on public.hotel_marketing_campaigns
  for select using (true);

grant execute on function public.get_active_hotel_marketing_campaigns to authenticated, anon;
grant execute on function public.admin_search_hotels_for_marketing to authenticated;
grant execute on function public.admin_list_hotel_marketing_campaigns to authenticated;
grant execute on function public.admin_create_hotel_marketing_campaign to authenticated;
grant execute on function public.admin_end_hotel_marketing_campaign to authenticated;
