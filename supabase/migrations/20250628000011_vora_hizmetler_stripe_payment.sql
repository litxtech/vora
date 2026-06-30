-- Vora Hizmetler: yalnızca Stripe, teklif kabulü sonrası gerçek ödeme

alter table public.vora_service_payments drop constraint if exists vora_service_payments_method_check;

alter table public.vora_service_payments
  add column if not exists amount_cents integer,
  add column if not exists commission_cents integer not null default 0,
  add column if not exists provider_net_cents integer,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

update public.vora_service_payments
set method = 'stripe'
where method <> 'stripe';

alter table public.vora_service_payments
  add constraint vora_service_payments_method_check check (method in ('stripe'));

create unique index if not exists vora_service_payments_stripe_session_uidx
  on public.vora_service_payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists vora_service_payments_request_active_uidx
  on public.vora_service_payments (request_id)
  where status in ('pending', 'authorized', 'completed');

create or replace function public.fulfill_vora_service_payment(
  p_request_id uuid,
  p_offer_id uuid,
  p_payer_id uuid,
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
  v_request public.vora_service_requests%rowtype;
  v_offer public.vora_service_offers%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_payment_id uuid;
  v_commission int;
  v_net int;
  v_amount numeric(12,2);
  v_data jsonb;
begin
  if p_gross_cents is null or p_gross_cents < 1 then
    return null;
  end if;

  select * into v_request
  from public.vora_service_requests
  where id = p_request_id
  for update;

  if not found then return null; end if;
  if v_request.requester_id <> p_payer_id then return null; end if;
  if v_request.status not in ('offer_accepted', 'en_route', 'in_progress') then return null; end if;

  select * into v_offer
  from public.vora_service_offers
  where id = p_offer_id
    and request_id = p_request_id
    and status = 'accepted'
  for update;

  if not found then return null; end if;

  select * into v_provider
  from public.vora_service_providers
  where id = v_offer.provider_id;

  if exists (
    select 1 from public.vora_service_payments
    where stripe_checkout_session_id = p_session_id
  ) then
    select id into v_payment_id
    from public.vora_service_payments
    where stripe_checkout_session_id = p_session_id;
    return v_payment_id;
  end if;

  if exists (
    select 1 from public.vora_service_payments
    where request_id = p_request_id
      and status in ('authorized', 'completed')
  ) then
    select id into v_payment_id
    from public.vora_service_payments
    where request_id = p_request_id
      and status in ('authorized', 'completed')
    order by created_at desc
    limit 1;
    return v_payment_id;
  end if;

  v_commission := round(p_gross_cents * 0.15)::int;
  v_net := p_gross_cents - v_commission;
  v_amount := round((p_gross_cents::numeric / 100.0), 2);

  insert into public.vora_service_payments (
    request_id,
    offer_id,
    payer_id,
    payee_provider_id,
    amount,
    amount_cents,
    commission_cents,
    provider_net_cents,
    method,
    status,
    external_ref,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    note
  )
  values (
    p_request_id,
    p_offer_id,
    p_payer_id,
    v_offer.provider_id,
    v_amount,
    p_gross_cents,
    v_commission,
    v_net,
    'stripe',
    'authorized',
    p_payment_intent_id,
    p_session_id,
    p_payment_intent_id,
    'Stripe güvenli ödeme — Vora güvencesinde tutulur'
  )
  returning id into v_payment_id;

  if v_request.status = 'offer_accepted' then
    update public.vora_service_requests
    set status = 'en_route', updated_at = now()
    where id = p_request_id;

    insert into public.vora_service_status_log (request_id, status, note)
    values (p_request_id, 'en_route', 'Stripe ödemesi alındı');
  end if;

  v_data := jsonb_build_object(
    'service_request_id', p_request_id,
    'request_id', p_request_id,
    'payment_id', v_payment_id,
    'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
  );

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values
      (
        p_payer_id,
        'vora_service_offer_accepted',
        'Ödemeniz alındı',
        left(v_request.title, 120) || ' — tutar güvence altında',
        v_data,
        v_provider.user_id
      ),
      (
        v_provider.user_id,
        'vora_service_offer_accepted',
        'Ödeme yapıldı',
        left(v_request.title, 120) || ' — işe başlayabilirsiniz',
        v_data,
        p_payer_id
      );
  end if;

  return v_payment_id;
end;
$$;

revoke all on function public.fulfill_vora_service_payment(uuid, uuid, uuid, text, text, integer) from public;
grant execute on function public.fulfill_vora_service_payment(uuid, uuid, uuid, text, text, integer) to service_role;
