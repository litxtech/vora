-- Stripe admin: iade desteği, birleşik ödeme listesi, genişletilmiş özet

alter table public.platform_contributions
  drop constraint if exists platform_contributions_status_check;

alter table public.platform_contributions
  add constraint platform_contributions_status_check
  check (status in ('pending', 'completed', 'failed', 'refunded'));

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
      select count(*)::int from public.premium_subscriptions where status in ('canceled', 'cancelled')
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
    'event_ticket_payments', coalesce((
      select count(*)::int from public.event_tickets
      where status = 'paid' and stripe_payment_intent_id is not null
    ), 0),
    'event_ticket_total', coalesce((
      select sum(amount_cents)::numeric / 100.0 from public.event_tickets
      where status = 'paid' and stripe_payment_intent_id is not null
    ), 0),
    'refunded_payments', coalesce((
      select count(*)::int from (
        select id from public.platform_contributions where status = 'refunded'
        union all
        select id from public.event_tickets where status = 'refunded'
      ) t
    ), 0),
    'refunded_total', coalesce((
      select sum(amount)::numeric from (
        select amount_cents::numeric / 100.0 as amount
        from public.platform_contributions where status = 'refunded'
        union all
        select amount_cents::numeric / 100.0 as amount
        from public.event_tickets where status = 'refunded'
      ) t
    ), 0),
    'pending_payments', coalesce((
      select count(*)::int from (
        select id from public.platform_contributions where status = 'pending'
        union all
        select id from public.event_tickets where status = 'pending'
      ) t
    ), 0),
    'last_subscription_at', (
      select max(created_at) from public.premium_subscriptions
    ),
    'last_payment_at', (
      select max(ts) from (
        select coalesce(completed_at, created_at) as ts
        from public.platform_contributions
        where stripe_payment_intent_id is not null
        union all
        select coalesce(paid_at, created_at) as ts
        from public.event_tickets
        where stripe_payment_intent_id is not null
      ) t
    )
  );
end; $$;

create or replace function public.admin_list_stripe_payments(p_limit int default 50)
returns table (
  id uuid,
  payment_type text,
  user_id uuid,
  username text,
  label text,
  amount_cents integer,
  status text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select *
  from (
    select
      c.id,
      'contribution'::text as payment_type,
      c.user_id,
      p.username,
      c.tier as label,
      c.amount_cents,
      c.status,
      c.stripe_payment_intent_id,
      c.completed_at as paid_at,
      c.created_at
    from public.platform_contributions c
    join public.profiles p on p.id = c.user_id
    where c.stripe_payment_intent_id is not null
      or c.status in ('pending', 'completed', 'refunded')

    union all

    select
      t.id,
      'event_ticket'::text as payment_type,
      t.user_id,
      p.username,
      e.title as label,
      t.amount_cents,
      t.status,
      t.stripe_payment_intent_id,
      t.paid_at,
      t.created_at
    from public.event_tickets t
    join public.profiles p on p.id = t.user_id
    join public.events e on e.id = t.event_id
    where t.stripe_payment_intent_id is not null
      or t.status in ('pending', 'paid', 'refunded')
  ) payments
  order by coalesce(payments.paid_at, payments.created_at) desc
  limit p_limit;
end; $$;

create or replace function public.admin_get_stripe_payment_for_refund(
  p_payment_type text,
  p_record_id uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    select jsonb_build_object(
      'stripe_payment_intent_id', c.stripe_payment_intent_id,
      'status', c.status,
      'amount_cents', c.amount_cents,
      'username', p.username
    )
    into v_result
    from public.platform_contributions c
    join public.profiles p on p.id = c.user_id
    where c.id = p_record_id;
  elsif p_payment_type = 'event_ticket' then
    select jsonb_build_object(
      'stripe_payment_intent_id', t.stripe_payment_intent_id,
      'status', t.status,
      'amount_cents', t.amount_cents,
      'username', p.username
    )
    into v_result
    from public.event_tickets t
    join public.profiles p on p.id = t.user_id
    where t.id = p_record_id;
  else
    raise exception 'Geçersiz ödeme türü';
  end if;

  if v_result is null then
    raise exception 'Ödeme kaydı bulunamadı';
  end if;

  return v_result;
end; $$;

create or replace function public.admin_mark_stripe_payment_refunded(
  p_payment_type text,
  p_record_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_payment_type = 'contribution' then
    update public.platform_contributions
    set status = 'refunded'
    where id = p_record_id and status = 'completed';
    if not found then raise exception 'İade edilebilir katkı bulunamadı'; end if;

    delete from public.user_badges
    where user_id = (select user_id from public.platform_contributions where id = p_record_id)
      and badge_type = 'platform_supporter';
  elsif p_payment_type = 'event_ticket' then
    update public.event_tickets
    set status = 'refunded'
    where id = p_record_id and status = 'paid';
    if not found then raise exception 'İade edilebilir bilet bulunamadı'; end if;
  else
    raise exception 'Geçersiz ödeme türü';
  end if;
end; $$;

grant execute on function public.admin_list_stripe_payments(int) to authenticated;
grant execute on function public.admin_get_stripe_payment_for_refund(text, uuid) to authenticated;
grant execute on function public.admin_mark_stripe_payment_refunded(text, uuid) to authenticated;
