-- İtiraz / iade / heyet entegrasyonu

alter type public.heyet_subject_type add value if not exists 'vora_service_request';
alter type public.notification_event_type add value if not exists 'vora_service_dispute_opened';
alter type public.notification_event_type add value if not exists 'vora_service_refund_completed';

create or replace function public.resolve_heyet_subject(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns table (
  party_a_id uuid,
  party_b_id uuid,
  title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject_type = 'ride_reservation' then
    return query
    select
      rr.passenger_id,
      t.driver_id,
      'Heyet · Yolculuk ' || left(rr.id::text, 8)
    from public.ride_reservations rr
    join public.ride_trips t on t.id = rr.trip_id
    where rr.id = p_subject_id;
    return;
  end if;

  if p_subject_type = 'marketplace_order' then
    return query
    select
      mo.buyer_id,
      mo.seller_id,
      'Heyet · ' || mo.order_number
    from public.marketplace_orders mo
    where mo.id = p_subject_id;
    return;
  end if;

  if p_subject_type = 'hotel_reservation' then
    return query
    select
      hr.guest_id,
      hr.owner_id,
      'Heyet · ' || hr.reservation_code
    from public.hotel_reservations hr
    where hr.id = p_subject_id;
    return;
  end if;

  if p_subject_type = 'vora_service_request' then
    return query
    select
      r.requester_id,
      p.user_id,
      'Heyet · ' || left(r.title, 60)
    from public.vora_service_requests r
    join public.vora_service_providers p on p.id = r.accepted_provider_id
    where r.id = p_subject_id;
    return;
  end if;

  raise exception 'Geçersiz heyet konusu';
end;
$$;

create or replace function public.vora_requester_open_dispute(
  p_request_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.vora_service_requests%rowtype;
  v_payment public.vora_service_payments%rowtype;
  v_provider_user_id uuid;
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_reason is null or char_length(v_reason) < 10 then
    return jsonb_build_object('error', 'İtiraz nedeni en az 10 karakter olmalı');
  end if;

  select * into v_request
  from public.vora_service_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Talep bulunamadı');
  end if;

  if v_request.requester_id <> auth.uid() then
    return jsonb_build_object('error', 'Yalnızca iş veren itiraz açabilir');
  end if;

  if v_request.status not in ('en_route', 'in_progress', 'completed') then
    return jsonb_build_object('error', 'Bu aşamada itiraz açılamaz');
  end if;

  select * into v_payment
  from public.vora_service_payments
  where request_id = p_request_id
    and status in ('authorized', 'completed')
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('error', 'Ödeme kaydı bulunamadı');
  end if;

  if v_payment.dispute_opened_at is not null then
    return jsonb_build_object('error', 'İtiraz zaten açık');
  end if;

  if v_payment.payout_completed_at is not null then
    return jsonb_build_object('error', 'Ödeme usta hesabına aktarıldı — destek ile iletişime geçin');
  end if;

  update public.vora_service_payments
  set dispute_opened_at = now(), dispute_reason = v_reason
  where id = v_payment.id;

  insert into public.vora_service_status_log (request_id, status, note)
  values (p_request_id, v_request.status, 'Müşteri itiraz açtı: ' || left(v_reason, 200));

  select user_id into v_provider_user_id
  from public.vora_service_providers
  where id = v_request.accepted_provider_id;

  if public.is_vora_hizmetler_push_enabled() and v_provider_user_id is not null then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_provider_user_id,
      'vora_service_dispute_opened',
      'İtiraz açıldı',
      left(v_request.title, 80) || ' · müşteri sorun bildirdi',
      jsonb_build_object(
        'request_id', p_request_id,
        'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
      ),
      v_request.requester_id
    );
  end if;

  return jsonb_build_object('ok', true, 'payment_id', v_payment.id);
end;
$$;

grant execute on function public.vora_requester_open_dispute(uuid, text) to authenticated;

create or replace function public.admin_mark_vora_service_payment_refunded(
  p_payment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.vora_service_payments%rowtype;
  v_request public.vora_service_requests%rowtype;
begin
  if not public.is_moderator() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  select * into v_payment
  from public.vora_service_payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Ödeme bulunamadı');
  end if;

  if v_payment.refunded_at is not null then
    return jsonb_build_object('error', 'Zaten iade edildi');
  end if;

  select * into v_request from public.vora_service_requests where id = v_payment.request_id;

  update public.vora_service_payments
  set
    status = 'refunded',
    refunded_at = now(),
    payout_due_at = null
  where id = p_payment_id;

  update public.vora_service_requests
  set status = 'cancelled', updated_at = now()
  where id = v_payment.request_id
    and status not in ('rated', 'cancelled');

  perform public.clear_vora_service_live_location(v_payment.request_id);

  insert into public.vora_service_status_log (request_id, status, note)
  values (v_payment.request_id, 'cancelled', 'Admin iade işlemi tamamlandı');

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_payment.payer_id,
      'vora_service_refund_completed',
      'İade tamamlandı',
      left(v_request.title, 80) || ' · ödemeniz iade edildi',
      jsonb_build_object('request_id', v_payment.request_id, 'deep_link', '/wallet'),
      null
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_mark_vora_service_payment_refunded(uuid) to authenticated;

-- Stripe iade RPC — vora_service desteği
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
  elsif p_payment_type = 'marketplace_order' then
    select jsonb_build_object(
      'stripe_payment_intent_id', o.stripe_payment_intent_id,
      'status', o.status,
      'amount_cents', o.gross_amount_cents,
      'username', p.username
    )
    into v_result
    from public.marketplace_orders o
    join public.profiles p on p.id = o.buyer_id
    where o.id = p_record_id;
  elsif p_payment_type = 'ride_reservation' then
    select jsonb_build_object(
      'stripe_payment_intent_id', r.stripe_payment_intent_id,
      'status', r.payment_status,
      'amount_cents', r.amount_cents,
      'username', p.username
    )
    into v_result
    from public.ride_reservations r
    join public.profiles p on p.id = r.passenger_id
    where r.id = p_record_id;
  elsif p_payment_type = 'vora_service' then
    select jsonb_build_object(
      'stripe_payment_intent_id', pay.stripe_payment_intent_id,
      'status', pay.status,
      'amount_cents', pay.amount_cents,
      'username', p.username
    )
    into v_result
    from public.vora_service_payments pay
    join public.profiles p on p.id = pay.payer_id
    where pay.id = p_record_id;
  else
    raise exception 'Geçersiz ödeme türü';
  end if;

  if v_result is null then raise exception 'Ödeme kaydı bulunamadı'; end if;
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
  elsif p_payment_type = 'marketplace_order' then
    perform public.admin_marketplace_order_refunded(p_record_id);
  elsif p_payment_type = 'ride_reservation' then
    perform public.admin_mark_ride_reservation_refunded(p_record_id);
  elsif p_payment_type = 'vora_service' then
    perform public.admin_mark_vora_service_payment_refunded(p_record_id);
  else
    raise exception 'Geçersiz ödeme türü';
  end if;
end; $$;
