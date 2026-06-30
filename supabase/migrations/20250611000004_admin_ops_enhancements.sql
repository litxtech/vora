-- Gelir kayıtları, etkinlik biletleri, broadcast hedefleme, loglar, yakın arkadaşlar

create or replace function public.get_admin_revenue_summary()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'total_revenue', coalesce((select sum(amount) from public.revenue_records), 0),
    'by_type', coalesce((
      select jsonb_object_agg(revenue_type::text, type_total)
      from (
        select revenue_type, sum(amount) as type_total
        from public.revenue_records group by revenue_type
      ) sub
    ), '{}'::jsonb),
    'platform_contributions_total', coalesce((
      select sum(amount_cents)::numeric / 100.0
      from public.platform_contributions where status = 'completed'
    ), 0),
    'premium_businesses', (select count(*)::int from public.businesses where is_verified = true),
    'premium_users', (select count(*)::int from public.profiles where is_premium = true),
    'stripe_subscriptions_active', coalesce((
      select count(*)::int from public.premium_subscriptions where status = 'active'
    ), 0)
  );
end; $$;

create or replace function public.admin_list_revenue_records(p_limit int default 50, p_type text default null)
returns table (
  id uuid,
  revenue_type text,
  amount numeric,
  currency text,
  reference_label text,
  recorded_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select r.id, r.revenue_type::text, r.amount, r.currency, r.reference_label, r.recorded_at
  from public.revenue_records r
  where p_type is null or r.revenue_type::text = p_type
  order by r.recorded_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_list_event_tickets(p_event_id uuid default null, p_limit int default 50)
returns table (
  id uuid,
  event_id uuid,
  event_title text,
  user_id uuid,
  username text,
  status text,
  amount_cents integer,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select t.id, t.event_id, e.title, t.user_id, p.username, t.status, t.amount_cents, t.created_at
  from public.event_tickets t
  join public.events e on e.id = t.event_id
  join public.profiles p on p.id = t.user_id
  where p_event_id is null or t.event_id = p_event_id
  order by t.created_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_list_event_checkins(p_event_id uuid, p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  checked_in_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select c.id, c.user_id, p.username, c.checked_in_at
  from public.event_checkins c
  join public.profiles p on p.id = c.user_id
  where c.event_id = p_event_id
  order by c.checked_in_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_preview_broadcast_recipients(
  p_region_id text default null,
  p_role text default null
)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  select count(*)::int into v_count
  from public.profiles p
  where p.account_status = 'active'
    and (p_region_id is null or p.region_id = p_region_id)
    and (p_role is null or p.role::text = p_role);
  return v_count;
end; $$;

create or replace function public.admin_send_broadcast(
  p_type public.broadcast_type,
  p_title text,
  p_body text,
  p_region_id text default null,
  p_role text default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_event public.notification_event_type;
  v_recipient record;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  v_event := case p_type when 'emergency' then 'emergency'::public.notification_event_type else 'system'::public.notification_event_type end;
  for v_recipient in
    select p.id from public.profiles p
    where p.account_status = 'active'
      and (p_region_id is null or p.region_id = p_region_id)
      and (p_role is null or p.role::text = p_role)
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true, 'broadcast_type', p_type), auth.uid());
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true, 'broadcast_type', p_type), auth.uid());
    v_count := v_count + 1;
  end loop;
  insert into public.admin_broadcasts (sent_by, broadcast_type, title, body, region_id, recipient_count)
  values (auth.uid(), p_type, p_title, p_body, p_region_id, v_count);
  return v_count;
end; $$;

create or replace function public.admin_list_moderation_logs(
  p_action text default null,
  p_limit int default 100
)
returns table (
  id uuid,
  moderator_id uuid,
  moderator_username text,
  target_type text,
  target_id uuid,
  action text,
  reason text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select m.id, m.moderator_id, p.username, m.target_type, m.target_id, m.action, m.reason, m.created_at
  from public.moderation_actions m
  left join public.profiles p on p.id = m.moderator_id
  where p_action is null or m.action = p_action
  order by m.created_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_list_user_close_friends(p_user_id uuid, p_limit int default 30)
returns table (
  friend_id uuid,
  username text,
  full_name text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select cf.friend_id, p.username, p.full_name, cf.created_at
  from public.close_friends cf
  join public.profiles p on p.id = cf.friend_id
  where cf.user_id = p_user_id
  order by cf.created_at desc
  limit p_limit;
end; $$;

grant execute on function public.admin_list_revenue_records(int, text) to authenticated;
grant execute on function public.admin_list_event_tickets(uuid, int) to authenticated;
grant execute on function public.admin_list_event_checkins(uuid, int) to authenticated;
grant execute on function public.admin_preview_broadcast_recipients(text, text) to authenticated;
grant execute on function public.admin_list_moderation_logs(text, int) to authenticated;
grant execute on function public.admin_list_user_close_friends(uuid, int) to authenticated;
