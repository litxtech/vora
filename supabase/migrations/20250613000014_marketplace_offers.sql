-- Yerel Pazar — fiyat / takas teklifleri

alter type public.notification_event_type add value if not exists 'marketplace_offer';
alter type public.notification_event_type add value if not exists 'marketplace_offer_accepted';
alter type public.notification_event_type add value if not exists 'marketplace_offer_rejected';

create type public.marketplace_offer_status as enum (
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'expired'
);

create table public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer,
  currency text not null default 'try',
  message text,
  status public.marketplace_offer_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_offers_message_check check (
    message is null or char_length(trim(message)) between 1 and 500
  ),
  constraint marketplace_offers_amount_check check (
    amount_cents is null or amount_cents > 0
  )
);

create unique index marketplace_offers_pending_buyer_idx
  on public.marketplace_offers (listing_id, buyer_id)
  where status = 'pending';

create index marketplace_offers_listing_idx
  on public.marketplace_offers (listing_id, status, created_at desc);

create index marketplace_offers_buyer_idx
  on public.marketplace_offers (buyer_id, created_at desc);

alter table public.marketplace_offers enable row level security;

create policy marketplace_offers_read on public.marketplace_offers
  for select using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.marketplace_listings l
      where l.id = marketplace_offers.listing_id and l.author_id = auth.uid()
    )
    or public.is_moderator()
  );

create or replace function public.format_cents_label(p_cents integer, p_currency text default 'try')
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_currency, 'try')) = 'try'
      then '₺' || to_char(p_cents / 100.0, 'FM999G999G999D00')
    else upper(p_currency) || ' ' || to_char(p_cents / 100.0, 'FM999G999G999D00')
  end;
$$;

create or replace function public.marketplace_submit_offer(
  p_listing_id uuid,
  p_amount_cents integer default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_offer_id uuid;
  v_buyer_name text;
  v_body text;
  v_trimmed text;
begin
  v_trimmed := nullif(trim(coalesce(p_message, '')), '');

  select * into v_listing from public.marketplace_listings where id = p_listing_id for update;
  if not found then
    return jsonb_build_object('error', 'İlan bulunamadı');
  end if;

  if v_listing.author_id = auth.uid() then
    return jsonb_build_object('error', 'Kendi ilanınıza teklif veremezsiniz');
  end if;

  if v_listing.status <> 'active' or v_listing.content_status <> 'published' then
    return jsonb_build_object('error', 'Bu ilan teklif kabul etmiyor');
  end if;

  if v_listing.listing_type = 'free' then
    return jsonb_build_object('error', 'Ücretsiz ilanlara teklif verilemez');
  end if;

  if v_listing.listing_type = 'trade' then
    if v_trimmed is null then
      return jsonb_build_object('error', 'Takas teklifinizi yazın');
    end if;
  elsif p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('error', 'Geçerli bir teklif tutarı girin');
  end if;

  update public.marketplace_offers
  set status = 'withdrawn', updated_at = now()
  where listing_id = p_listing_id
    and buyer_id = auth.uid()
    and status = 'pending';

  insert into public.marketplace_offers (listing_id, buyer_id, amount_cents, currency, message)
  values (p_listing_id, auth.uid(), p_amount_cents, v_listing.currency, v_trimmed)
  returning id into v_offer_id;

  select coalesce(full_name, username, 'Kullanıcı') into v_buyer_name
  from public.profiles where id = auth.uid();

  v_body := case
    when v_listing.listing_type = 'trade' then left(v_buyer_name || ': ' || v_trimmed, 120)
    else left(v_buyer_name || ' — ' || public.format_cents_label(p_amount_cents, v_listing.currency), 120)
  end;

  perform public.notify_marketplace_user(
    v_listing.author_id,
    'marketplace_offer',
    'Yeni teklif',
    v_body,
    jsonb_build_object('listing_id', p_listing_id, 'offer_id', v_offer_id),
    auth.uid()
  );

  return jsonb_build_object('ok', true, 'offer_id', v_offer_id);
end;
$$;

create or replace function public.marketplace_respond_to_offer(
  p_offer_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.marketplace_offers%rowtype;
  v_listing public.marketplace_listings%rowtype;
  v_body text;
begin
  if p_action not in ('accept', 'reject') then
    return jsonb_build_object('error', 'Geçersiz işlem');
  end if;

  select * into v_offer from public.marketplace_offers where id = p_offer_id for update;
  if not found then
    return jsonb_build_object('error', 'Teklif bulunamadı');
  end if;

  if v_offer.status <> 'pending' then
    return jsonb_build_object('error', 'Teklif artık beklemede değil');
  end if;

  select * into v_listing from public.marketplace_listings where id = v_offer.listing_id for update;
  if v_listing.author_id <> auth.uid() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  if p_action = 'accept' then
    update public.marketplace_offers
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = p_offer_id;

    update public.marketplace_offers
    set status = 'rejected', responded_at = now(), updated_at = now()
    where listing_id = v_offer.listing_id
      and id <> p_offer_id
      and status = 'pending';

    update public.marketplace_listings
    set status = 'reserved', updated_at = now()
    where id = v_offer.listing_id and status = 'active';

    v_body := case
      when v_listing.listing_type = 'trade' then 'Takas teklifiniz kabul edildi. Satıcıyla iletişime geçin.'
      else coalesce(public.format_cents_label(v_offer.amount_cents, v_offer.currency), '') || ' teklifiniz kabul edildi.'
    end;

    perform public.notify_marketplace_user(
      v_offer.buyer_id,
      'marketplace_offer_accepted',
      'Teklifiniz kabul edildi',
      left(v_listing.title || ' — ' || v_body, 180),
      jsonb_build_object('listing_id', v_offer.listing_id, 'offer_id', v_offer.id),
      auth.uid()
    );
  else
    update public.marketplace_offers
    set status = 'rejected', responded_at = now(), updated_at = now()
    where id = p_offer_id;

    perform public.notify_marketplace_user(
      v_offer.buyer_id,
      'marketplace_offer_rejected',
      'Teklifiniz reddedildi',
      left(v_listing.title || ' — başka bir teklif deneyebilirsiniz.', 180),
      jsonb_build_object('listing_id', v_offer.listing_id, 'offer_id', v_offer.id),
      auth.uid()
    );
  end if;

  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$;

create or replace function public.marketplace_withdraw_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.marketplace_offers%rowtype;
begin
  select * into v_offer from public.marketplace_offers where id = p_offer_id for update;
  if not found then
    return jsonb_build_object('error', 'Teklif bulunamadı');
  end if;

  if v_offer.buyer_id <> auth.uid() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  if v_offer.status <> 'pending' then
    return jsonb_build_object('error', 'Bu teklif geri çekilemez');
  end if;

  update public.marketplace_offers
  set status = 'withdrawn', updated_at = now()
  where id = p_offer_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.marketplace_submit_offer(uuid, integer, text) to authenticated;
grant execute on function public.marketplace_respond_to_offer(uuid, text) to authenticated;
grant execute on function public.marketplace_withdraw_offer(uuid) to authenticated;
