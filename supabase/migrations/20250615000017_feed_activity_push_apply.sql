-- Bölgesel akış aktivitesi: "Vora çok canlı — hemen bak" push bildirimleri

insert into public.notification_sound_settings (event_type, label)
values ('feed_activity', 'Canlı Akış')
on conflict (event_type) do nothing;

create table if not exists public.feed_activity_push_cooldown (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_sent_at timestamptz not null default now()
);

create table if not exists public.feed_activity_region_flush (
  region_id text primary key references public.regions (id),
  last_flush_at timestamptz not null default now()
);

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
  v_body text;
  v_sent int := 0;
  v_user_cooldown interval := interval '90 minutes';
  v_region_cooldown interval := interval '45 minutes';
  v_last_flush timestamptz;
begin
  if p_region_id is null or p_sample_post_id is null then
    return 0;
  end if;

  select last_flush_at
  into v_last_flush
  from public.feed_activity_region_flush
  where region_id = p_region_id;

  if not p_force and v_last_flush is not null and v_last_flush > now() - v_region_cooldown then
    return 0;
  end if;

  if p_post_count <= 1 then
    v_body := 'Vora çok canlı — hemen bak, yeni paylaşımlar var!';
  elsif p_post_count < 5 then
    v_body := format('Vora çok canlı! %s yeni paylaşım — hemen bak.', p_post_count);
  else
    v_body := format('Vora çok canlı! %s+ yeni paylaşım — kaçırma, hemen bak!', p_post_count);
  end if;

  with recipients as (
    select p.id as user_id
    from public.profiles p
    where p.account_status = 'active'
      and p.region_id = p_region_id
      and coalesce((p.notification_prefs->>'feed')::boolean, true) = true
      and exists (
        select 1
        from public.push_tokens pt
        where pt.user_id = p.id
          and pt.is_active = true
          and (pt.expo_push_token is not null or pt.device_push_token is not null)
      )
      and not exists (
        select 1
        from public.feed_activity_push_cooldown c
        where c.user_id = p.id
          and c.last_sent_at > now() - v_user_cooldown
      )
  ),
  outbox_rows as (
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    select
      r.user_id,
      'feed_activity'::public.notification_event_type,
      'Vora çok canlı 🔥',
      v_body,
      jsonb_build_object(
        'region_id', p_region_id,
        'post_id', p_sample_post_id,
        'recent_post_count', greatest(p_post_count, 1)
      )
    from recipients r
    returning recipient_id
  ),
  inbox_rows as (
    insert into public.notifications (user_id, event_type, title, body, data)
    select
      r.user_id,
      'feed_activity'::public.notification_event_type,
      'Vora çok canlı 🔥',
      v_body,
      jsonb_build_object(
        'region_id', p_region_id,
        'post_id', p_sample_post_id,
        'recent_post_count', greatest(p_post_count, 1)
      )
    from recipients r
    returning user_id
  ),
  cooldown_rows as (
    insert into public.feed_activity_push_cooldown (user_id, last_sent_at)
    select r.user_id, now()
    from recipients r
    on conflict (user_id) do update
      set last_sent_at = excluded.last_sent_at
    returning user_id
  )
  select count(*)::int
  into v_sent
  from outbox_rows;

  if v_sent > 0 then
    insert into public.feed_activity_region_flush (region_id, last_flush_at)
    values (p_region_id, now())
    on conflict (region_id) do update
      set last_flush_at = excluded.last_flush_at;
  end if;

  return v_sent;
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
  v_recent_count int;
  v_min_posts int := 2;
begin
  if p_region_id is null or p_post_id is null then
    return;
  end if;

  select count(*)::int
  into v_recent_count
  from public.posts
  where region_id = p_region_id
    and status = 'published'
    and audience = 'public'
    and created_at > now() - interval '30 minutes';

  if v_recent_count < v_min_posts then
    return;
  end if;

  perform public.enqueue_regional_feed_activity(
    p_region_id,
    p_post_id,
    v_recent_count,
    false
  );
end;
$$;

create or replace function public.track_feed_activity_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  if new.status <> 'published' or new.audience <> 'public' then
    return new;
  end if;

  perform public.maybe_enqueue_feed_activity(new.region_id, new.id, new.author_id);
  return new;
end;
$$;

drop trigger if exists posts_feed_activity_notify on public.posts;
create trigger posts_feed_activity_notify
  after insert or update of status on public.posts
  for each row
  when (new.status = 'published' and new.audience = 'public')
  execute function public.track_feed_activity_post();

create or replace function public.notification_category_for(p_event_type public.notification_event_type)
returns public.notification_category
language sql
immutable
as $$
  select case p_event_type
    when 'like' then 'social'::public.notification_category
    when 'comment' then 'social'::public.notification_category
    when 'comment_reply' then 'social'::public.notification_category
    when 'quote' then 'social'::public.notification_category
    when 'follow' then 'social'::public.notification_category
    when 'friend_request' then 'social'::public.notification_category
    when 'friend_accepted' then 'social'::public.notification_category
    when 'mention' then 'social'::public.notification_category
    when 'reel_like' then 'social'::public.notification_category
    when 'save' then 'social'::public.notification_category
    when 'share' then 'social'::public.notification_category
    when 'feed_activity' then 'social'::public.notification_category
    when 'message' then 'messages'::public.notification_category
    when 'group_message' then 'messages'::public.notification_category
    when 'call_incoming' then 'messages'::public.notification_category
    when 'call_video' then 'messages'::public.notification_category
    when 'call_missed' then 'messages'::public.notification_category
    when 'job' then 'jobs'::public.notification_category
    when 'business_post' then 'businesses'::public.notification_category
    when 'business_campaign' then 'businesses'::public.notification_category
    when 'business_event' then 'businesses'::public.notification_category
    when 'event_nearby' then 'businesses'::public.notification_category
    when 'emergency' then 'emergency'::public.notification_category
    when 'regional_alert' then 'emergency'::public.notification_category
    when 'incident_update' then 'emergency'::public.notification_category
    when 'security_alert' then 'emergency'::public.notification_category
    else 'system'::public.notification_category
  end;
$$;

grant execute on function public.enqueue_regional_feed_activity(text, uuid, int, boolean) to service_role;
grant execute on function public.maybe_enqueue_feed_activity(text, uuid, uuid) to service_role;
