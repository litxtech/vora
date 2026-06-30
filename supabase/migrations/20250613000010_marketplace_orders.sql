-- Yerel Pazar — siparişler, escrow, komisyon, admin ödeme kuyruğu

alter type public.revenue_type add value if not exists 'marketplace_commission';

alter type public.notification_event_type add value if not exists 'marketplace_order_paid';
alter type public.notification_event_type add value if not exists 'marketplace_ship_request';
alter type public.notification_event_type add value if not exists 'marketplace_buyer_confirm';
alter type public.notification_event_type add value if not exists 'marketplace_platform_approved';
alter type public.notification_event_type add value if not exists 'marketplace_payout_due';
alter type public.notification_event_type add value if not exists 'marketplace_payout_completed';
alter type public.notification_event_type add value if not exists 'marketplace_comment';

create type public.marketplace_order_status as enum (
  'pending_payment',
  'paid_escrow',
  'seller_shipped',
  'buyer_confirmed',
  'platform_approved',
  'payout_scheduled',
  'payout_completed',
  'closed',
  'disputed',
  'refund_pending',
  'refunded',
  'cancelled'
);

create table public.marketplace_seller_payout_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  account_holder text not null,
  iban text not null,
  bank_name text,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_payout_iban_format check (iban ~ '^TR[0-9]{24}$')
);

create table public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  listing_id uuid not null references public.marketplace_listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  business_id uuid references public.businesses (id) on delete set null,
  gross_amount_cents integer not null check (gross_amount_cents >= 5000),
  commission_rate numeric(5, 4) not null default 0.15,
  commission_cents integer not null,
  seller_net_cents integer not null,
  currency text not null default 'try',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_fee_cents integer,
  status public.marketplace_order_status not null default 'pending_payment',
  dispute_reason text,
  tracking_number text,
  seller_iban text,
  seller_account_name text,
  payout_reference text,
  payout_notes text,
  paid_at timestamptz,
  seller_shipped_at timestamptz,
  buyer_confirmed_at timestamptz,
  platform_approved_at timestamptz,
  platform_approved_by uuid references public.profiles (id) on delete set null,
  payout_due_at timestamptz,
  payout_completed_at timestamptz,
  payout_completed_by uuid references public.profiles (id) on delete set null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketplace_orders_buyer_idx on public.marketplace_orders (buyer_id, created_at desc);
create index marketplace_orders_seller_idx on public.marketplace_orders (seller_id, created_at desc);
create index marketplace_orders_status_idx on public.marketplace_orders (status, created_at desc);
create index marketplace_orders_payout_due_idx on public.marketplace_orders (payout_due_at)
  where status in ('platform_approved', 'payout_scheduled');
create index marketplace_orders_listing_idx on public.marketplace_orders (listing_id);

create table public.marketplace_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders (id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index marketplace_order_events_order_idx
  on public.marketplace_order_events (order_id, created_at asc);

create table public.marketplace_order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders (id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  file_name text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id) on delete set null
);

create or replace function public.generate_marketplace_order_number()
returns text
language plpgsql
as $$
declare
  v_num text;
begin
  v_num := 'MP-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-'
    || lpad((floor(random() * 10000))::int::text, 4, '0');
  return v_num;
end;
$$;

create or replace function public.log_marketplace_order_event(
  p_order_id uuid,
  p_event_type text,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.marketplace_order_events (order_id, event_type, actor_id, actor_role, payload)
  values (p_order_id, p_event_type, p_actor_id, p_actor_role, coalesce(p_payload, '{}'));
end;
$$;

create or replace function public.notify_marketplace_user(
  p_user_id uuid,
  p_event_type public.notification_event_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}',
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (p_user_id, p_event_type, p_title, left(p_body, 180), p_data, p_actor_id);
end;
$$;

create or replace function public.fulfill_marketplace_order(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_gross_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_commission int;
  v_net int;
  v_title text;
begin
  select * into v_listing from public.marketplace_listings where id = p_listing_id for update;
  if not found then return null; end if;
  if v_listing.status <> 'active' or v_listing.content_status <> 'published' then
    return null;
  end if;
  if v_listing.author_id = p_buyer_id then return null; end if;

  v_commission := round(p_gross_cents * 0.15)::int;
  v_net := p_gross_cents - v_commission;
  v_order_number := public.generate_marketplace_order_number();
  v_title := v_listing.title;

  insert into public.marketplace_orders (
    order_number, listing_id, buyer_id, seller_id, business_id,
    gross_amount_cents, commission_cents, seller_net_cents,
    stripe_checkout_session_id, stripe_payment_intent_id,
    status, paid_at
  )
  values (
    v_order_number, p_listing_id, p_buyer_id, v_listing.author_id, v_listing.business_id,
    p_gross_cents, v_commission, v_net,
    p_session_id, p_payment_intent_id,
    'paid_escrow', now()
  )
  returning id into v_order_id;

  update public.marketplace_listings
  set status = 'reserved', updated_at = now()
  where id = p_listing_id;

  perform public.log_marketplace_order_event(
    v_order_id, 'payment_received', p_buyer_id, 'buyer',
    jsonb_build_object('gross_cents', p_gross_cents, 'session_id', p_session_id)
  );

  perform public.notify_marketplace_user(
    p_buyer_id, 'marketplace_order_paid', 'Ödemeniz alındı',
    v_title || ' — ödemeniz güvence altında.',
    jsonb_build_object('order_id', v_order_id, 'listing_id', p_listing_id),
    v_listing.author_id
  );

  perform public.notify_marketplace_user(
    v_listing.author_id, 'marketplace_order_paid', 'Yeni satış!',
    v_title || ' — lütfen teslimat bildirimi yapın.',
    jsonb_build_object('order_id', v_order_id, 'listing_id', p_listing_id),
    p_buyer_id
  );

  return v_order_id;
end;
$$;

create or replace function public.marketplace_seller_mark_shipped(
  p_order_id uuid,
  p_tracking_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
begin
  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'Sipariş bulunamadı'); end if;
  if v_order.seller_id <> auth.uid() then return jsonb_build_object('error', 'Yetkisiz'); end if;
  if v_order.status <> 'paid_escrow' then return jsonb_build_object('error', 'Bu adım şu an yapılamaz'); end if;

  update public.marketplace_orders
  set status = 'seller_shipped',
      seller_shipped_at = now(),
      tracking_number = nullif(trim(p_tracking_number), ''),
      updated_at = now()
  where id = p_order_id;

  perform public.log_marketplace_order_event(
    p_order_id, 'seller_shipped', auth.uid(), 'seller',
    jsonb_build_object('tracking_number', p_tracking_number)
  );

  perform public.notify_marketplace_user(
    v_order.buyer_id, 'marketplace_buyer_confirm', 'Teslim onayı',
    'Siparişiniz yola çıktı/teslim edildi — lütfen onaylayın.',
    jsonb_build_object('order_id', p_order_id),
    v_order.seller_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.marketplace_buyer_confirm_receipt(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
begin
  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'Sipariş bulunamadı'); end if;
  if v_order.buyer_id <> auth.uid() then return jsonb_build_object('error', 'Yetkisiz'); end if;
  if v_order.status <> 'seller_shipped' then return jsonb_build_object('error', 'Bu adım şu an yapılamaz'); end if;

  update public.marketplace_orders
  set status = 'buyer_confirmed',
      buyer_confirmed_at = now(),
      updated_at = now()
  where id = p_order_id;

  perform public.log_marketplace_order_event(p_order_id, 'buyer_confirmed', auth.uid(), 'buyer', '{}');

  perform public.notify_marketplace_user(
    v_order.seller_id, 'marketplace_platform_approved', 'Alıcı onayladı',
    'Platform incelemesi bekleniyor.',
    jsonb_build_object('order_id', p_order_id),
    v_order.buyer_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_marketplace_platform_approve(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
  v_due timestamptz;
begin
  if not public.is_admin() then return jsonb_build_object('error', 'Yetkisiz'); end if;

  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'Sipariş bulunamadı'); end if;
  if v_order.status <> 'buyer_confirmed' then return jsonb_build_object('error', 'Alıcı onayı gerekli'); end if;

  v_due := now() + interval '9 days';

  update public.marketplace_orders
  set status = 'payout_scheduled',
      platform_approved_at = now(),
      platform_approved_by = auth.uid(),
      payout_due_at = v_due,
      updated_at = now()
  where id = p_order_id;

  perform public.log_marketplace_order_event(
    p_order_id, 'platform_approved', auth.uid(), 'admin',
    jsonb_build_object('payout_due_at', v_due)
  );

  perform public.notify_marketplace_user(
    v_order.buyer_id, 'marketplace_platform_approved', 'İşlem onaylandı',
    'Siparişiniz platform tarafından onaylandı.',
    jsonb_build_object('order_id', p_order_id),
    null
  );

  perform public.notify_marketplace_user(
    v_order.seller_id, 'marketplace_payout_due', 'Ödeme planlandı',
    'Net tutar en geç 9 gün içinde hesabınıza yatırılacak.',
    jsonb_build_object('order_id', p_order_id, 'payout_due_at', v_due),
    null
  );

  return jsonb_build_object('ok', true, 'payout_due_at', v_due);
end;
$$;

create or replace function public.admin_marketplace_mark_payout(
  p_order_id uuid,
  p_reference text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.marketplace_orders%rowtype;
  v_listing_title text;
begin
  if not public.is_admin() then return jsonb_build_object('error', 'Yetkisiz'); end if;

  select o.* into v_order from public.marketplace_orders o where o.id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'Sipariş bulunamadı'); end if;
  if v_order.status not in ('payout_scheduled', 'platform_approved') then
    return jsonb_build_object('error', 'Ödeme bu aşamada yapılamaz');
  end if;

  select title into v_listing_title from public.marketplace_listings where id = v_order.listing_id;

  update public.marketplace_orders
  set status = 'payout_completed',
      payout_completed_at = now(),
      payout_completed_by = auth.uid(),
      payout_reference = nullif(trim(p_reference), ''),
      payout_notes = nullif(trim(p_notes), ''),
      updated_at = now()
  where id = p_order_id;

  update public.marketplace_listings
  set status = 'sold', sold_at = now(), updated_at = now()
  where id = v_order.listing_id;

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
  values (
    'marketplace_commission'::public.revenue_type,
    v_order.commission_cents / 100.0,
    upper(v_order.currency),
    v_order.id,
    coalesce(v_listing_title, v_order.order_number),
    'Yerel Pazar %15 komisyon — ' || v_order.order_number
  );

  perform public.log_marketplace_order_event(
    p_order_id, 'payout_completed', auth.uid(), 'admin',
    jsonb_build_object('reference', p_reference)
  );

  perform public.notify_marketplace_user(
    v_order.seller_id, 'marketplace_payout_completed', 'Ödeme yatırıldı',
    '₺' || (v_order.seller_net_cents / 100.0)::text || ' hesabınıza aktarıldı.',
    jsonb_build_object('order_id', p_order_id),
    null
  );

  perform public.notify_marketplace_user(
    v_order.buyer_id, 'marketplace_payout_completed', 'İşlem tamamlandı',
    'Siparişiniz başarıyla tamamlandı.',
    jsonb_build_object('order_id', p_order_id),
    null
  );

  update public.marketplace_orders set status = 'closed', updated_at = now() where id = p_order_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_admin_marketplace_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return jsonb_build_object(
    'active_listings', (select count(*)::int from public.marketplace_listings where status = 'active'),
    'escrow_total_cents', coalesce((
      select sum(gross_amount_cents)::int from public.marketplace_orders
      where status in ('paid_escrow', 'seller_shipped', 'buyer_confirmed')
    ), 0),
    'awaiting_platform_approval', (select count(*)::int from public.marketplace_orders where status = 'buyer_confirmed'),
    'payout_due_today', (select count(*)::int from public.marketplace_orders
      where status = 'payout_scheduled' and payout_due_at::date <= current_date),
    'payout_overdue', (select count(*)::int from public.marketplace_orders
      where status = 'payout_scheduled' and payout_due_at < now()),
    'total_commission', coalesce((
      select sum(amount) from public.revenue_records where revenue_type = 'marketplace_commission'
    ), 0),
    'pending_reports', (select count(*)::int from public.marketplace_reports where status = 'pending')
  );
end;
$$;

create or replace function public.admin_list_marketplace_orders(
  p_filter text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  order_number text,
  listing_title text,
  buyer_name text,
  seller_name text,
  gross_amount_cents int,
  commission_cents int,
  seller_net_cents int,
  status public.marketplace_order_status,
  paid_at timestamptz,
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
    o.id,
    o.order_number,
    l.title as listing_title,
    coalesce(bp.full_name, bp.username, '—') as buyer_name,
    coalesce(sp.full_name, sp.username, '—') as seller_name,
    o.gross_amount_cents,
    o.commission_cents,
    o.seller_net_cents,
    o.status,
    o.paid_at,
    o.payout_due_at,
    o.payout_completed_at,
    o.created_at
  from public.marketplace_orders o
  join public.marketplace_listings l on l.id = o.listing_id
  join public.profiles bp on bp.id = o.buyer_id
  join public.profiles sp on sp.id = o.seller_id
  where public.is_moderator()
    and (
      p_filter = 'all'
      or (p_filter = 'approval' and o.status = 'buyer_confirmed')
      or (p_filter = 'payout_due' and o.status = 'payout_scheduled' and o.payout_due_at::date <= current_date + 3)
      or (p_filter = 'overdue' and o.status = 'payout_scheduled' and o.payout_due_at < now())
      or (p_filter = 'escrow' and o.status in ('paid_escrow', 'seller_shipped', 'buyer_confirmed'))
    )
  order by
    case when o.status = 'payout_scheduled' then o.payout_due_at end asc nulls last,
    o.created_at desc
  limit greatest(p_limit, 1);
$$;

alter table public.marketplace_seller_payout_profiles enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_events enable row level security;
alter table public.marketplace_order_documents enable row level security;

create policy marketplace_payout_profile_own on public.marketplace_seller_payout_profiles
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy marketplace_orders_parties on public.marketplace_orders
  for select using (
    buyer_id = auth.uid() or seller_id = auth.uid() or public.is_moderator()
  );

create policy marketplace_order_events_read on public.marketplace_order_events
  for select using (
    exists (
      select 1 from public.marketplace_orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_moderator())
    )
  );

create policy marketplace_order_documents_read on public.marketplace_order_documents
  for select using (
    exists (
      select 1 from public.marketplace_orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_moderator())
    )
  );

grant execute on function public.fulfill_marketplace_order(uuid, uuid, text, text, int) to service_role;
grant execute on function public.marketplace_seller_mark_shipped(uuid, text) to authenticated;
grant execute on function public.marketplace_buyer_confirm_receipt(uuid) to authenticated;
grant execute on function public.admin_marketplace_platform_approve(uuid) to authenticated;
grant execute on function public.admin_marketplace_mark_payout(uuid, text, text) to authenticated;
grant execute on function public.get_admin_marketplace_summary() to authenticated;
grant execute on function public.admin_list_marketplace_orders(text, int) to authenticated;
