-- İş tamamlama → 7 gün sonra usta ödemesi + bildirimler

alter type public.notification_event_type add value if not exists 'vora_service_job_completed';
alter type public.notification_event_type add value if not exists 'vora_service_payout_due';
alter type public.notification_event_type add value if not exists 'vora_service_payout_completed';

alter table public.vora_service_payments
  add column if not exists job_completed_at timestamptz,
  add column if not exists payout_due_at timestamptz,
  add column if not exists payout_completed_at timestamptz,
  add column if not exists payout_reference text;

create index if not exists vora_service_payments_payout_due_idx
  on public.vora_service_payments (payout_due_at)
  where payout_completed_at is null
    and payout_due_at is not null
    and status = 'authorized';

create or replace function public.complete_vora_service_job(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.vora_service_requests%rowtype;
  v_payment public.vora_service_payments%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_due timestamptz := now() + interval '7 days';
  v_data jsonb;
  v_customer_body text;
  v_provider_body text;
begin
  select * into v_request
  from public.vora_service_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Talep bulunamadı');
  end if;

  if v_request.requester_id <> auth.uid() then
    return jsonb_build_object('error', 'Yalnızca iş veren tamamlayabilir');
  end if;

  if v_request.status not in ('en_route', 'in_progress') then
    return jsonb_build_object('error', 'Bu adım şu an yapılamaz');
  end if;

  select * into v_payment
  from public.vora_service_payments
  where request_id = p_request_id
    and status = 'authorized'
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('error', 'Önce Stripe ödemesi tamamlanmalı');
  end if;

  if v_payment.job_completed_at is not null then
    return jsonb_build_object('error', 'İş zaten tamamlandı');
  end if;

  select * into v_provider
  from public.vora_service_providers
  where id = v_payment.payee_provider_id;

  update public.vora_service_requests
  set status = 'completed', updated_at = now()
  where id = p_request_id;

  update public.vora_service_payments
  set
    job_completed_at = now(),
    payout_due_at = v_due,
    note = 'Vora güvencesinde — usta ödemesi 7 gün içinde planlandı'
  where id = v_payment.id;

  insert into public.vora_service_status_log (request_id, status, note)
  values (p_request_id, 'completed', 'Müşteri işi tamamladı · usta ödemesi planlandı');

  v_data := jsonb_build_object(
    'service_request_id', p_request_id,
    'request_id', p_request_id,
    'payment_id', v_payment.id,
    'payout_due_at', v_due,
    'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
  );

  v_customer_body :=
    'Vora güvencesindesiniz. Ödemeniz iş teslim edilene kadar platformda güvende; '
    || coalesce(v_provider.display_name, 'Usta') || ' hesabına en geç 7 gün içinde aktarılacak.';

  v_provider_body :=
    left(v_request.title, 100) || ' · ödemeniz 7 gün içinde hesabınıza yatırılacak';

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values
      (
        v_request.requester_id,
        'vora_service_job_completed',
        'İş tamamlandı',
        v_customer_body,
        v_data,
        v_provider.user_id
      ),
      (
        v_provider.user_id,
        'vora_service_payout_due',
        'Ödeme planlandı',
        v_provider_body,
        v_data || jsonb_build_object('deep_link', '/vora-hizmetler?tab=offers'),
        v_request.requester_id
      );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values
      (
        v_request.requester_id,
        'vora_service_job_completed',
        'Vora güvencesindesiniz',
        v_customer_body,
        v_data,
        v_provider.user_id,
        'jobs',
        'normal'
      ),
      (
        v_provider.user_id,
        'vora_service_payout_due',
        'Kazancınız planlandı',
        v_provider_body,
        v_data || jsonb_build_object('deep_link', '/vora-hizmetler?tab=offers'),
        v_request.requester_id,
        'jobs',
        'high'
      );
  end if;

  return jsonb_build_object(
    'ok', true,
    'payout_due_at', v_due,
    'provider_net_cents', v_payment.provider_net_cents
  );
end;
$$;

grant execute on function public.complete_vora_service_job(uuid) to authenticated;

create or replace function public.admin_mark_vora_service_payout(
  p_payment_id uuid,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.vora_service_payments%rowtype;
  v_request public.vora_service_requests%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_data jsonb;
  v_amount_label text;
begin
  if not public.is_moderator() then
    return jsonb_build_object('error', 'Yetkisiz');
  end if;

  select * into v_payment
  from public.vora_service_payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Ödeme kaydı bulunamadı');
  end if;

  if v_payment.payout_completed_at is not null then
    return jsonb_build_object('error', 'Zaten yatırıldı');
  end if;

  if v_payment.payout_due_at is null then
    return jsonb_build_object('error', 'Henüz ödeme planlanmadı');
  end if;

  select * into v_request from public.vora_service_requests where id = v_payment.request_id;
  select * into v_provider from public.vora_service_providers where id = v_payment.payee_provider_id;

  update public.vora_service_payments
  set
    status = 'completed',
    payout_completed_at = now(),
    payout_reference = nullif(trim(p_reference), '')
  where id = p_payment_id;

  v_amount_label := '₺' || trim(to_char(coalesce(v_payment.provider_net_cents, 0) / 100.0, 'FM999999990.00'));

  v_data := jsonb_build_object(
    'payment_id', p_payment_id,
    'request_id', v_payment.request_id,
    'deep_link', '/wallet'
  );

  if v_provider.user_id is not null and public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_provider.user_id,
      'vora_service_payout_completed',
      'Kazancınız yatırıldı',
      v_amount_label || ' hesabınıza aktarıldı · ' || left(v_request.title, 80),
      v_data,
      null
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_mark_vora_service_payout(uuid, text) to authenticated;
