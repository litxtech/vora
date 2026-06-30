-- Otel pazarlama: bildirim önizleme, otomatik format ve tekrar engeli

create or replace function public.admin_preview_hotel_marketing_recipients(
  p_region_scope text default 'platform',
  p_region_id text default null
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select count(*)::int into v_count
  from public.profiles p
  where coalesce((p.notification_prefs->>'hotels')::boolean, true)
    and (
      coalesce(p_region_scope, 'platform') = 'platform'
      or p.region_id = p_region_id
    );

  return coalesce(v_count, 0);
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
  v_should_notify boolean;
  v_scope text;
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

  v_scope := coalesce(p_region_scope, 'platform');

  if v_scope = 'region' and p_region_id is null then
    raise exception 'Bölgesel kampanya için bölge seçin';
  end if;

  if p_days is not null and p_days > 0 then
    v_ends := now() + (p_days || ' days')::interval;
  end if;

  v_should_notify := coalesce(p_notify_users, false);

  insert into public.hotel_marketing_campaigns (
    hotel_id, campaign_type, headline, message,
    region_scope, region_id, priority, platform_wide, notify_users,
    starts_at, ends_at, created_by
  ) values (
    p_hotel_id, p_campaign_type, trim(p_headline), trim(p_message),
    v_scope,
    case when v_scope = 'region' then p_region_id else null end,
    greatest(0, coalesce(p_priority, 0)),
    coalesce(p_platform_wide, true),
    v_should_notify,
    now(), v_ends, auth.uid()
  )
  returning id into v_id;

  perform public.sync_hotel_listing_featured_from_campaigns(p_hotel_id);

  if v_should_notify then
    v_title := trim(p_headline);
    v_body := left(trim(v_hotel.name) || ' — ' || trim(p_message), 180);

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
        'headline', trim(p_headline),
        'kind', 'hotel_marketing',
        'image_url', v_hotel.cover_url
      ),
      auth.uid()
    from public.profiles p
    where coalesce((p.notification_prefs->>'hotels')::boolean, true)
      and (
        v_scope = 'platform'
        or p.region_id = p_region_id
      )
      and not exists (
        select 1
        from public.notifications n
        where n.user_id = p.id
          and n.event_type = 'hotel_marketing_campaign'
          and n.data->>'hotel_id' = p_hotel_id::text
          and n.created_at > now() - interval '7 days'
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
        'headline', trim(p_headline),
        'kind', 'hotel_marketing',
        'image_url', v_hotel.cover_url
      ),
      auth.uid(),
      'businesses'::public.notification_category,
      case
        when p_campaign_type in ('weekend_youth', 'event') then 'high'::public.notification_priority
        else 'normal'::public.notification_priority
      end
    from public.profiles p
    where coalesce((p.notification_prefs->>'hotels')::boolean, true)
      and (
        v_scope = 'platform'
        or p.region_id = p_region_id
      )
      and not exists (
        select 1
        from public.notifications n
        where n.user_id = p.id
          and n.event_type = 'hotel_marketing_campaign'
          and n.data->>'hotel_id' = p_hotel_id::text
          and n.created_at > now() - interval '7 days'
      );
  end if;

  return v_id;
end;
$$;

grant execute on function public.admin_preview_hotel_marketing_recipients to authenticated;
