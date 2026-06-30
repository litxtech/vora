-- Otel rezervasyonları: sahip ödemesi (7 gün), platform komisyon takibi

alter type public.revenue_type add value if not exists 'hotel_commission';
alter type public.notification_event_type add value if not exists 'hotel_payout_due';
alter type public.notification_event_type add value if not exists 'hotel_payout_completed';

alter table public.hotel_reservations
  add column if not exists completed_at timestamptz,
  add column if not exists payout_due_at timestamptz,
  add column if not exists payout_completed_at timestamptz,
  add column if not exists payout_reference text,
  add column if not exists payout_completed_by uuid references public.profiles (id) on delete set null;

create index if not exists hotel_reservations_payout_due_idx
  on public.hotel_reservations (payout_due_at)
  where payout_completed_at is null and status = 'completed';

update public.hotel_reservations
set completed_at = coalesce(completed_at, updated_at)
where status = 'completed' and completed_at is null;

update public.hotel_reservations
set payout_due_at = coalesce(payout_due_at, completed_at + interval '7 days')
where status = 'completed'
  and payout_completed_at is null
  and completed_at is not null
  and payout_due_at is null;

create or replace function public.complete_hotel_reservation(
  p_reservation_id uuid,
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
  v_due timestamptz := now() + interval '7 days';
  v_hotel_name text;
begin
  select * into v_res
  from public.hotel_reservations
  where id = p_reservation_id and owner_id = p_owner_id
  for update;

  if not found then return false; end if;
  if v_res.status <> 'confirmed' then return false; end if;

  update public.hotel_reservations
  set
    status = 'completed',
    completed_at = now(),
    payout_due_at = v_due,
    updated_at = now()
  where id = p_reservation_id;

  perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  perform public.log_hotel_reservation_event(
    p_reservation_id, 'completed', p_owner_id,
    jsonb_build_object('payout_due_at', v_due)
  );

  select name into v_hotel_name from public.hotel_listings where id = v_res.hotel_id;

  perform public.notify_hotel_reservation_users(
    p_owner_id,
    'hotel_payout_due'::public.notification_event_type,
    'Ödeme planlandı',
    v_hotel_name || ' · ' || v_res.reservation_code || ' · 7 gün içinde hesabınıza',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/earnings',
      'payout_due_at', v_due,
      'owner_payout_cents', v_res.owner_payout_cents
    ),
    null
  );

  return true;
end;
$$;

create or replace function public.admin_mark_hotel_payout(
  p_reservation_id uuid,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
  v_hotel_name text;
begin
  if not public.is_moderator() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  select r.* into v_res
  from public.hotel_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then return jsonb_build_object('error', 'Rezervasyon bulunamadı'); end if;
  if v_res.status <> 'completed' then
    return jsonb_build_object('error', 'Ödeme yalnızca tamamlanan konaklamalarda yapılabilir');
  end if;
  if v_res.payout_completed_at is not null then
    return jsonb_build_object('error', 'Zaten ödendi');
  end if;

  select name into v_hotel_name from public.hotel_listings where id = v_res.hotel_id;

  update public.hotel_reservations
  set
    payout_completed_at = now(),
    payout_reference = nullif(trim(p_reference), ''),
    payout_completed_by = auth.uid(),
    updated_at = now()
  where id = p_reservation_id;

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
  values (
    'hotel_commission'::public.revenue_type,
    v_res.commission_cents / 100.0,
    upper(v_res.currency),
    v_res.id,
    coalesce(v_hotel_name, v_res.reservation_code),
    'Otel Merkezi %12 komisyon — ' || v_res.reservation_code
  );

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'payout_completed', auth.uid(),
    jsonb_build_object('reference', p_reference)
  );

  perform public.notify_hotel_reservation_users(
    v_res.owner_id,
    'hotel_payout_completed'::public.notification_event_type,
    'Kazanç yatırıldı',
    '₺' || (v_res.owner_payout_cents / 100.0)::text || ' hesabınıza aktarıldı · ' || v_res.reservation_code,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/earnings'
    ),
    null
  );

  perform public.log_commerce_admin_action(
    'hotel', 'payout_completed', p_reservation_id, v_res.reservation_code,
    jsonb_build_object('owner_payout_cents', v_res.owner_payout_cents, 'reference', p_reference)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_mark_hotel_payout to authenticated;

create or replace function public.get_commerce_ops_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '24 hours';
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return jsonb_build_object(
    'hotel_pending_payment', (
      select count(*)::int from public.hotel_reservations where status = 'pending_payment'
    ),
    'hotel_confirmed', (
      select count(*)::int from public.hotel_reservations where status = 'confirmed'
    ),
    'hotel_payout_due', (
      select count(*)::int from public.hotel_reservations
      where status = 'completed' and payout_completed_at is null
    ),
    'hotel_payout_overdue', (
      select count(*)::int from public.hotel_reservations
      where status = 'completed'
        and payout_completed_at is null
        and payout_due_at is not null
        and payout_due_at < now()
    ),
    'hotel_revenue_24h_cents', coalesce((
      select sum(gross_amount_cents)::int from public.hotel_reservations
      where status in ('confirmed', 'completed') and paid_at >= v_since
    ), 0),
    'hotel_commission_24h_cents', coalesce((
      select sum(amount * 100)::int from public.revenue_records
      where revenue_type = 'hotel_commission' and recorded_at >= v_since
    ), 0),
    'marketplace_escrow_cents', coalesce((
      select sum(gross_amount_cents)::int from public.marketplace_orders
      where status in ('paid_escrow', 'seller_shipped', 'buyer_confirmed')
    ), 0),
    'marketplace_approval_pending', (
      select count(*)::int from public.marketplace_orders where status = 'buyer_confirmed'
    ),
    'marketplace_payout_overdue', (
      select count(*)::int from public.marketplace_orders
      where status = 'payout_scheduled' and payout_due_at < now()
    ),
    'rides_pending_reservations', (
      select count(*)::int from public.ride_reservations
      where status = 'pending' and payment_status in ('pending', 'held')
    ),
    'rides_escrow_cents', coalesce((
      select sum(amount_cents)::int from public.ride_reservations
      where payment_status = 'held' and status in ('pending', 'approved')
    ), 0),
    'rides_payout_due', (
      select count(*)::int from public.ride_reservations
      where status = 'completed' and payment_status = 'released' and payout_completed_at is null
    ),
    'personnel_applications_pending', (
      select count(*)::int from public.job_applications where status in ('sent', 'reviewing')
    ),
    'personnel_staff_listings', (
      select count(*)::int from public.staff_requests where status = 'published'
    ),
    'personnel_job_listings', (
      select count(*)::int from public.job_listings where status = 'published'
    ),
    'transactions_24h', (
      select count(*)::int from (
        select id from public.hotel_reservations where created_at >= v_since
        union all
        select id from public.marketplace_orders where created_at >= v_since
        union all
        select id from public.ride_reservations where created_at >= v_since
      ) t
    ),
    'total_escrow_cents', coalesce((
      select sum(gross_amount_cents)::int from public.marketplace_orders
      where status in ('paid_escrow', 'seller_shipped', 'buyer_confirmed')
    ), 0) + coalesce((
      select sum(amount_cents)::int from public.ride_reservations
      where payment_status = 'held' and status in ('pending', 'approved')
    ), 0) + coalesce((
      select sum(gross_amount_cents)::int from public.hotel_reservations
      where status = 'confirmed' and payment_status = 'paid'
    ), 0)
  );
end;
$$;

drop function if exists public.admin_list_hotel_reservations(text, int);

create or replace function public.admin_list_hotel_reservations(
  p_filter text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  reservation_code text,
  hotel_id uuid,
  hotel_name text,
  guest_id uuid,
  guest_name text,
  owner_id uuid,
  owner_name text,
  region_id text,
  check_in date,
  check_out date,
  nights smallint,
  guests_count smallint,
  gross_amount_cents int,
  commission_cents int,
  owner_payout_cents int,
  status public.hotel_reservation_status,
  payment_status text,
  paid_at timestamptz,
  completed_at timestamptz,
  payout_due_at timestamptz,
  payout_completed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.reservation_code,
    r.hotel_id,
    h.name as hotel_name,
    r.guest_id,
    coalesce(gp.full_name, gp.username, '—') as guest_name,
    r.owner_id,
    coalesce(op.full_name, op.username, '—') as owner_name,
    h.region_id,
    r.check_in,
    r.check_out,
    r.nights,
    r.guests_count,
    r.gross_amount_cents,
    r.commission_cents,
    r.owner_payout_cents,
    r.status,
    r.payment_status,
    r.paid_at,
    r.completed_at,
    r.payout_due_at,
    r.payout_completed_at,
    r.created_at
  from public.hotel_reservations r
  join public.hotel_listings h on h.id = r.hotel_id
  join public.profiles gp on gp.id = r.guest_id
  join public.profiles op on op.id = r.owner_id
  where public.is_moderator()
    and (
      p_filter = 'all'
      or (p_filter = 'pending' and r.status = 'pending_payment')
      or (p_filter = 'confirmed' and r.status = 'confirmed')
      or (p_filter = 'escrow' and r.status = 'confirmed' and r.payment_status = 'paid')
      or (p_filter = 'payout_due' and r.status = 'completed' and r.payout_completed_at is null)
      or (p_filter = 'completed' and r.status in ('completed', 'refunded', 'cancelled'))
    )
  order by
    case when p_filter = 'payout_due' then r.payout_due_at end asc nulls last,
    r.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.admin_list_commerce_transactions(
  p_module text default 'all',
  p_filter text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  module text,
  reference_code text,
  title text,
  from_party_id uuid,
  from_party_name text,
  to_party_id uuid,
  to_party_name text,
  gross_cents int,
  commission_cents int,
  net_cents int,
  status text,
  payment_status text,
  region_id text,
  created_at timestamptz,
  meta jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  (
    select
      r.id,
      'hotel'::text as module,
      r.reservation_code as reference_code,
      h.name as title,
      r.guest_id as from_party_id,
      coalesce(gp.full_name, gp.username, '—') as from_party_name,
      r.owner_id as to_party_id,
      coalesce(op.full_name, op.username, '—') as to_party_name,
      r.gross_amount_cents as gross_cents,
      r.commission_cents,
      r.owner_payout_cents as net_cents,
      r.status::text,
      r.payment_status,
      h.region_id,
      r.created_at,
      jsonb_build_object(
        'check_in', r.check_in,
        'check_out', r.check_out,
        'nights', r.nights,
        'hotel_id', r.hotel_id,
        'payout_due_at', r.payout_due_at,
        'payout_completed_at', r.payout_completed_at
      ) as meta
    from public.hotel_reservations r
    join public.hotel_listings h on h.id = r.hotel_id
    join public.profiles gp on gp.id = r.guest_id
    join public.profiles op on op.id = r.owner_id
    where public.is_moderator()
      and r.status <> 'pending_payment'
      and (p_module in ('all', 'hotel'))
      and (
        p_filter = 'all'
        or (p_filter = 'pending' and r.status = 'confirmed')
        or (p_filter = 'escrow' and r.status = 'confirmed' and r.payment_status = 'paid')
        or (p_filter = 'payout_due' and r.status = 'completed' and r.payout_completed_at is null)
        or (p_filter = 'completed' and r.status in ('completed', 'refunded', 'cancelled'))
      )
  )
  union all
  (
    select
      o.id,
      'marketplace'::text,
      o.order_number,
      l.title,
      o.buyer_id,
      coalesce(bp.full_name, bp.username, '—'),
      o.seller_id,
      coalesce(sp.full_name, sp.username, '—'),
      o.gross_amount_cents,
      o.commission_cents,
      o.seller_net_cents,
      o.status::text,
      null::text,
      l.region_id,
      o.created_at,
      jsonb_build_object('listing_id', o.listing_id, 'order_number', o.order_number)
    from public.marketplace_orders o
    join public.marketplace_listings l on l.id = o.listing_id
    join public.profiles bp on bp.id = o.buyer_id
    join public.profiles sp on sp.id = o.seller_id
    where public.is_moderator()
      and (p_module in ('all', 'marketplace'))
      and (
        p_filter = 'all'
        or (p_filter = 'pending' and o.status = 'buyer_confirmed')
        or (p_filter = 'escrow' and o.status in ('paid_escrow', 'seller_shipped', 'buyer_confirmed'))
        or (p_filter = 'payout_due' and o.status = 'payout_scheduled')
        or (p_filter = 'completed' and o.status in ('payout_completed', 'closed', 'refunded', 'cancelled'))
      )
  )
  union all
  (
    select
      r.id,
      'rides'::text,
      r.id::text,
      t.from_city_id || ' → ' || t.to_city_id,
      r.passenger_id,
      coalesce(pp.full_name, pp.username, '—'),
      t.driver_id,
      coalesce(dp.full_name, dp.username, '—'),
      r.amount_cents,
      r.commission_cents,
      r.driver_payout_cents,
      r.status::text,
      r.payment_status::text,
      null::text,
      r.created_at,
      jsonb_build_object('trip_id', r.trip_id, 'seat_count', r.seat_count)
    from public.ride_reservations r
    join public.ride_trips t on t.id = r.trip_id
    join public.profiles pp on pp.id = r.passenger_id
    join public.profiles dp on dp.id = t.driver_id
    where public.is_moderator()
      and (p_module in ('all', 'rides'))
      and (
        p_filter = 'all'
        or (p_filter = 'pending' and r.status = 'pending')
        or (p_filter = 'escrow' and r.payment_status = 'held')
        or (p_filter = 'payout_due' and r.status = 'completed' and r.payment_status = 'released' and r.payout_completed_at is null)
        or (p_filter = 'completed' and r.status in ('completed', 'cancelled', 'rejected', 'no_show'))
      )
  )
  order by created_at desc
  limit greatest(p_limit, 1);
$$;
