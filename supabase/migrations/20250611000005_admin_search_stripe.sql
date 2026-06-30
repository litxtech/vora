-- Hashtag / topluluk arama + sayfalama, Stripe webhook özeti

create or replace function public.admin_list_hashtags(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (id uuid, tag text, post_count int, is_hidden boolean, is_featured boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select h.id, h.tag, h.post_count, h.is_hidden, h.is_featured, h.created_at
  from public.hashtags h
  where p_search is null or h.tag ilike '%' || trim(p_search) || '%'
  order by h.post_count desc
  limit p_limit offset p_offset;
end; $$;

create or replace function public.admin_list_communities(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  category text,
  region_id text,
  member_count int,
  post_count int,
  is_suspended boolean,
  created_by uuid,
  owner_username text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select
    c.id,
    c.name,
    c.slug,
    c.category,
    c.region_id,
    c.member_count,
    c.post_count,
    c.is_suspended,
    c.created_by,
    p.username as owner_username,
    c.created_at
  from public.communities c
  join public.profiles p on p.id = c.created_by
  where
    p_search is null
    or c.name ilike '%' || trim(p_search) || '%'
    or c.slug ilike '%' || trim(p_search) || '%'
    or p.username ilike '%' || trim(p_search) || '%'
  order by c.member_count desc
  limit p_limit offset p_offset;
end; $$;

create or replace function public.get_admin_stripe_summary()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'active_subscriptions', coalesce((
      select count(*)::int from public.premium_subscriptions where status = 'active'
    ), 0),
    'expired_subscriptions', coalesce((
      select count(*)::int from public.premium_subscriptions where status = 'expired'
    ), 0),
    'canceled_subscriptions', coalesce((
      select count(*)::int from public.premium_subscriptions where status = 'canceled'
    ), 0),
    'stripe_linked_subscriptions', coalesce((
      select count(*)::int from public.premium_subscriptions
      where stripe_subscription_id is not null
    ), 0),
    'contribution_payments', coalesce((
      select count(*)::int from public.platform_contributions
      where status = 'completed' and stripe_payment_intent_id is not null
    ), 0),
    'contribution_total', coalesce((
      select sum(amount_cents)::numeric / 100.0 from public.platform_contributions
      where status = 'completed' and stripe_payment_intent_id is not null
    ), 0),
    'last_subscription_at', (
      select max(created_at) from public.premium_subscriptions
    )
  );
end; $$;

grant execute on function public.admin_list_hashtags(int, int, text) to authenticated;
grant execute on function public.admin_list_communities(int, int, text) to authenticated;
grant execute on function public.get_admin_stripe_summary() to authenticated;

create or replace function public.admin_remove_close_friend(p_user_id uuid, p_friend_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.close_friends
  where user_id = p_user_id and friend_id = p_friend_id;
end; $$;

grant execute on function public.admin_remove_close_friend(uuid, uuid) to authenticated;
