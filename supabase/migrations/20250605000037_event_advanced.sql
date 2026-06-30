-- BÖLÜM 13 — Etkinlik ileri aşama: biletler, admin promosyon, gelir

alter type public.revenue_type add value if not exists 'event_ticket';

alter table public.events
  add column if not exists ticket_price_cents integer,
  add column if not exists ticket_currency text not null default 'try';

alter table public.events
  add constraint events_ticket_price_nonneg
  check (ticket_price_cents is null or ticket_price_cents >= 0);

-- Etkinlik biletleri
create table public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'try',
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_tickets_event_idx on public.event_tickets (event_id, status);
create index event_tickets_user_idx on public.event_tickets (user_id, created_at desc);
create index event_tickets_session_idx on public.event_tickets (stripe_checkout_session_id) where stripe_checkout_session_id is not null;

-- Bilet ödendi → RSVP + gelir kaydı
create or replace function public.fulfill_event_ticket(
  p_event_id uuid,
  p_user_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    return;
  end if;

  insert into public.event_tickets (
    event_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
    amount_cents, currency, status, paid_at
  )
  values (
    p_event_id, p_user_id, p_session_id, p_payment_intent_id,
    p_amount_cents, coalesce(v_event.ticket_currency, 'try'), 'paid', now()
  )
  on conflict (event_id, user_id) do update
  set status = 'paid',
      stripe_checkout_session_id = excluded.stripe_checkout_session_id,
      stripe_payment_intent_id = excluded.stripe_payment_intent_id,
      amount_cents = excluded.amount_cents,
      paid_at = now()
  where public.event_tickets.status <> 'paid';

  insert into public.event_rsvps (event_id, user_id, status)
  values (p_event_id, p_user_id, 'going')
  on conflict (event_id, user_id) do update set status = 'going', updated_at = now();

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, region_id, notes)
  values (
    'event_ticket'::public.revenue_type,
    (p_amount_cents / 100.0),
    upper(coalesce(v_event.ticket_currency, 'try')),
    p_event_id,
    v_event.title,
    v_event.region_id,
    'Stripe bilet satışı'
  );
end;
$$;

-- Admin: etkinlik promosyonu
create or replace function public.admin_set_event_promotion(
  p_event_id uuid,
  p_is_featured boolean default null,
  p_is_sponsored boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.events
  set
    is_featured = coalesce(p_is_featured, is_featured),
    is_sponsored = coalesce(p_is_sponsored, is_sponsored),
    updated_at = now()
  where id = p_event_id
  returning * into v_event;

  if not found then
    raise exception 'Etkinlik bulunamadı';
  end if;

  if p_is_sponsored = true and v_event.is_sponsored then
    insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, region_id, recorded_by, notes)
    values (
      'sponsored_content'::public.revenue_type,
      0,
      'TRY',
      p_event_id,
      v_event.title,
      v_event.region_id,
      auth.uid(),
      'Sponsorlu etkinlik işaretlendi'
    );
  end if;
end;
$$;

-- Admin: etkinlik listesi
create or replace function public.get_admin_events(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t))
    from (
      select
        e.id,
        e.title,
        e.description,
        e.starts_at,
        e.region_id,
        e.status,
        e.ticket_type,
        e.ticket_price_cents,
        e.is_featured,
        e.is_sponsored,
        e.view_count,
        p.username as organizer_username,
        (select count(*)::int from public.event_rsvps r where r.event_id = e.id and r.status = 'going') as going_count
      from public.events e
      join public.profiles p on p.id = e.organizer_id
      order by e.starts_at desc
      limit greatest(1, least(p_limit, 100))
    ) t
  ), '[]'::jsonb);
end;
$$;

-- RLS
alter table public.event_tickets enable row level security;

create policy "event_tickets_self_read" on public.event_tickets
  for select using (auth.uid() = user_id or public.is_moderator());

create policy "event_tickets_organizer_read" on public.event_tickets
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_tickets.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "event_tickets_self_insert_pending" on public.event_tickets
  for insert with check (auth.uid() = user_id and status = 'pending');

-- Admin: etkinlik kaldır
create or replace function public.admin_remove_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.events set status = 'removed', updated_at = now() where id = p_event_id;
end;
$$;
