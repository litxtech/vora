-- Admin: işletme profilini kaldır / gönderilerde gizle, görüntüleyen listelerine eriş.

alter table public.businesses
  add column if not exists posts_visible boolean not null default true;

alter type public.moderation_action_type add value if not exists 'restore';
alter type public.moderation_action_type add value if not exists 'delete_permanent';

create or replace function public.protect_business_posts_visible()
returns trigger
language plpgsql
as $$
begin
  if new.posts_visible is distinct from old.posts_visible and not public.is_admin() then
    new.posts_visible := old.posts_visible;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_protect_posts_visible on public.businesses;
create trigger businesses_protect_posts_visible
  before update on public.businesses
  for each row execute function public.protect_business_posts_visible();

create or replace function public.admin_set_business_posts_visible(
  p_business_id uuid,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select owner_id into v_owner_id
  from public.businesses
  where id = p_business_id;

  if v_owner_id is null then
    raise exception 'İşletme bulunamadı';
  end if;

  update public.businesses
  set posts_visible = p_visible
  where id = p_business_id;
end;
$$;

create or replace function public.admin_remove_business_profile(
  p_business_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_reason text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_reason := coalesce(nullif(trim(p_reason), ''), 'Admin işletme profilini kaldırdı');

  select owner_id into v_owner_id
  from public.businesses
  where id = p_business_id;

  if v_owner_id is null then
    raise exception 'İşletme bulunamadı';
  end if;

  update public.businesses
  set
    registration_status = 'rejected',
    is_verified = false,
    posts_visible = false,
    shop_published = false
  where id = p_business_id;

  delete from public.user_badges
  where user_id = v_owner_id
    and badge_type = 'business';

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    'business',
    p_business_id,
    'remove',
    v_reason,
    jsonb_build_object('owner_id', v_owner_id)
  );

  perform public.admin_notify_content_moderation(
    v_owner_id,
    'content_removed'::public.notification_event_type,
    'business',
    p_business_id,
    'remove',
    v_reason
  );

  return jsonb_build_object(
    'business_id', p_business_id,
    'owner_id', v_owner_id,
    'removed', true
  );
end;
$$;

drop policy if exists "post_views_admin_read" on public.post_views;
create policy "post_views_admin_read" on public.post_views
  for select using (public.is_admin());

drop policy if exists "reel_views_admin_read" on public.reel_views;
create policy "reel_views_admin_read" on public.reel_views
  for select using (public.is_admin());

-- Admin, gönderiyi görüntüleyen herkesi görür; yalnızca kendi satırı değil.
create or replace function public.admin_list_post_viewers(
  p_post_id uuid,
  p_limit integer default 200
)
returns table (
  view_id uuid,
  viewer_id uuid,
  viewed_at timestamptz,
  username text,
  full_name text,
  avatar_url text,
  role text,
  is_verified boolean,
  is_follower boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_limit integer;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 200), 1), 500);

  select p.author_id into v_author_id
  from public.posts p
  where p.id = p_post_id;

  return query
  select
    pv.id,
    pv.viewer_id,
    pv.created_at,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    pr.role::text,
    pr.is_verified,
    exists (
      select 1
      from public.follows f
      where f.following_id = v_author_id
        and f.follower_id = pv.viewer_id
    )
  from public.post_views pv
  join public.profiles pr on pr.id = pv.viewer_id
  where pv.post_id = p_post_id
    and pv.viewer_id is not null
  order by pv.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.admin_list_reel_viewers(
  p_reel_id uuid,
  p_limit integer default 200
)
returns table (
  view_id uuid,
  viewer_id uuid,
  viewed_at timestamptz,
  username text,
  full_name text,
  avatar_url text,
  role text,
  is_verified boolean,
  is_follower boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_limit integer;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 200), 1), 500);

  select r.author_id into v_author_id
  from public.reels r
  where r.id = p_reel_id;

  return query
  select
    rv.viewer_id,
    rv.viewer_id,
    rv.created_at,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    pr.role::text,
    pr.is_verified,
    exists (
      select 1
      from public.follows f
      where f.following_id = v_author_id
        and f.follower_id = rv.viewer_id
    )
  from public.reel_views rv
  join public.profiles pr on pr.id = rv.viewer_id
  where rv.reel_id = p_reel_id
  order by rv.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.admin_set_business_posts_visible(uuid, boolean) to authenticated;
grant execute on function public.admin_remove_business_profile(uuid, text) to authenticated;
grant execute on function public.admin_list_post_viewers(uuid, integer) to authenticated;
grant execute on function public.admin_list_reel_viewers(uuid, integer) to authenticated;
