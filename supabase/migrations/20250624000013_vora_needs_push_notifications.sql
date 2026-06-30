-- İhtiyaç Ağı — yayın bildirimi altyapısı (varsayılan: kapalı)

alter type public.notification_event_type add value if not exists 'vora_need_published';

insert into public.app_system_config (key, value)
values (
  'vora_needs_push',
  jsonb_build_object(
    'enabled', false,
    'max_recipients', 200,
    'nearby_radius_km', 10
  )
)
on conflict (key) do nothing;

create or replace function public.is_vora_needs_push_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value->>'enabled')::boolean from public.app_system_config where key = 'vora_needs_push'),
    false
  );
$$;

create or replace function public.notify_vora_need_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_name text;
  v_author_username text;
  v_author_avatar text;
  v_push_title text;
  v_push_body text;
  v_category_label text;
  v_max_recipients int;
  v_radius_m double precision;
  v_data jsonb;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  if new.status <> 'active' or new.content_status <> 'published' then
    return new;
  end if;

  if not public.is_vora_needs_push_enabled() then
    return new;
  end if;

  select
    coalesce(p.full_name, p.username),
    p.username,
    p.avatar_url
  into v_author_name, v_author_username, v_author_avatar
  from public.profiles p
  where p.id = new.author_id;

  v_category_label := case new.category
    when 'product' then 'Yeni ürün ihtiyacı'
    when 'service' then 'Yeni hizmet ihtiyacı'
    when 'help' then 'Yardım ilanı'
    when 'job' then 'İş ihtiyacı'
    else 'Yeni ihtiyaç ilanı'
  end;

  v_push_title := case
    when new.urgency = 'urgent' then 'Acil · ' || v_category_label
    else v_category_label
  end;

  v_push_body := format(
    '%s · %s',
    coalesce('@' || v_author_username, v_author_name, 'Birisi'),
    left(new.title, 120)
  );

  v_data := jsonb_build_object(
    'vora_need_id', new.id,
    'need_id', new.id,
    'region_id', new.region_id,
    'category', new.category,
    'visibility', new.visibility,
    'urgency', new.urgency,
    'author_name', v_author_name,
    'author_username', v_author_username,
    'need_title', new.title,
    'sender_name', coalesce(v_author_name, '@' || v_author_username),
    'image_url', coalesce(new.image_url, v_author_avatar),
    'deep_link', '/detail/vora-needs/' || new.id::text
  );

  select coalesce((value->>'max_recipients')::int, 200)
  into v_max_recipients
  from public.app_system_config
  where key = 'vora_needs_push';

  select coalesce((value->>'nearby_radius_km')::double precision, 10) * 1000
  into v_radius_m
  from public.app_system_config
  where key = 'vora_needs_push';

  if new.visibility = 'global' then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id
    from public.profiles p
    where p.id <> new.author_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
    order by p.updated_at desc nulls last
    limit v_max_recipients;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    select
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id,
      'jobs'::public.notification_category,
      case when new.urgency = 'urgent' then 'high'::public.notification_priority else 'normal'::public.notification_priority end
    from public.profiles p
    where p.id <> new.author_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
    order by p.updated_at desc nulls last
    limit v_max_recipients;

  elsif new.visibility = 'nearby' and new.location is not null then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select distinct on (p.id)
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id
    from public.profiles p
    join public.proximity_match_presence pmp on pmp.user_id = p.id
    where p.id <> new.author_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
      and pmp.updated_at > now() - interval '2 hours'
      and st_dwithin(
        st_setsrid(st_makepoint(pmp.longitude, pmp.latitude), 4326)::geography,
        new.location,
        v_radius_m
      )
    order by p.id, pmp.updated_at desc
    limit v_max_recipients;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    select distinct on (p.id)
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id,
      'jobs'::public.notification_category,
      case when new.urgency = 'urgent' then 'high'::public.notification_priority else 'normal'::public.notification_priority end
    from public.profiles p
    join public.proximity_match_presence pmp on pmp.user_id = p.id
    where p.id <> new.author_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
      and pmp.updated_at > now() - interval '2 hours'
      and st_dwithin(
        st_setsrid(st_makepoint(pmp.longitude, pmp.latitude), 4326)::geography,
        new.location,
        v_radius_m
      )
    order by p.id, pmp.updated_at desc
    limit v_max_recipients;

  elsif new.region_id is not null then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id
    from public.profiles p
    left join public.regional_alert_subscriptions ras
      on ras.user_id = p.id and ras.region_id = new.region_id
    where p.id <> new.author_id
      and p.account_status = 'active'
      and p.region_id = new.region_id
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
      and coalesce(ras.notify_events, true) = true
    order by p.updated_at desc nulls last
    limit v_max_recipients;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    select
      p.id,
      'vora_need_published'::public.notification_event_type,
      v_push_title,
      v_push_body,
      v_data,
      new.author_id,
      'jobs'::public.notification_category,
      case when new.urgency = 'urgent' then 'high'::public.notification_priority else 'normal'::public.notification_priority end
    from public.profiles p
    left join public.regional_alert_subscriptions ras
      on ras.user_id = p.id and ras.region_id = new.region_id
    where p.id <> new.author_id
      and p.account_status = 'active'
      and p.region_id = new.region_id
      and coalesce((p.notification_prefs->>'vora_needs')::boolean, true) = true
      and coalesce(ras.notify_events, true) = true
    order by p.updated_at desc nulls last
    limit v_max_recipients;
  end if;

  return new;
end;
$$;

drop trigger if exists vora_need_published_notify on public.vora_needs;
create trigger vora_need_published_notify
  after insert on public.vora_needs
  for each row execute function public.notify_vora_need_published();
