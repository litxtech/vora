-- Vora Hizmetler — ödeme operasyonları (IBAN profili paylaşımı, admin listesi, hatırlatıcı, gelir kaydı)

alter type public.revenue_type add value if not exists 'hizmetler_commission';
alter type public.notification_event_type add value if not exists 'vora_service_payout_reminder';

-- Acil oturum ↔ talep köprüsü (accept RPC kullanır)
alter table public.vora_service_emergency_sessions
  add column if not exists request_id uuid references public.vora_service_requests (id);

create index if not exists vora_service_emergency_sessions_request_idx
  on public.vora_service_emergency_sessions (request_id)
  where request_id is not null;

-- İtiraz alanları
alter table public.vora_service_payments
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists refunded_at timestamptz;

-- ─── Gelişmiş admin payout ───────────────────────────────────────────────────

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

  if v_payment.dispute_opened_at is not null and v_payment.refunded_at is null then
    return jsonb_build_object('error', 'Açık itiraz var — önce heyet/iade çözülmeli');
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

  if coalesce(v_payment.commission_cents, 0) > 0 then
    insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
    values (
      'hizmetler_commission'::public.revenue_type,
      v_payment.commission_cents / 100.0,
      'TRY',
      v_payment.id,
      left(v_request.title, 80),
      'Vora Hizmetler %15 komisyon'
    );
  end if;

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

  if to_regprocedure('public.log_commerce_admin_action(text,text,uuid,text,jsonb)') is not null then
    perform public.log_commerce_admin_action(
      'hizmetler', 'payout_completed', p_payment_id, left(v_request.title, 80),
      jsonb_build_object('provider_net_cents', v_payment.provider_net_cents, 'reference', p_reference)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_list_vora_service_payouts(p_limit int default 50)
returns table (
  payment_id uuid,
  request_id uuid,
  request_title text,
  provider_name text,
  provider_user_id uuid,
  provider_net_cents int,
  payout_due_at timestamptz,
  payout_completed_at timestamptz,
  dispute_opened_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    p.id,
    p.request_id,
    r.title,
    pr.display_name,
    pr.user_id,
    p.provider_net_cents,
    p.payout_due_at,
    p.payout_completed_at,
    p.dispute_opened_at,
    p.status::text
  from public.vora_service_payments p
  join public.vora_service_requests r on r.id = p.request_id
  join public.vora_service_providers pr on pr.id = p.payee_provider_id
  where p.payout_due_at is not null
  order by
    case when p.payout_completed_at is null and p.payout_due_at < now() then 0 else 1 end,
    p.payout_due_at asc nulls last
  limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.admin_list_vora_service_payouts(int) to authenticated;

-- ─── Ödeme hatırlatıcı (admin moderatör bildirimi + usta bilgilendirme) ───────

create or replace function public.process_vora_service_payout_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_count int := 0;
  v_days_left int;
  v_provider_user_id uuid;
begin
  if not public.is_vora_hizmetler_push_enabled() then
    return 0;
  end if;

  for v_payment in
    select p.id, p.request_id, p.payout_due_at, p.payee_provider_id, r.title
    from public.vora_service_payments p
    join public.vora_service_requests r on r.id = p.request_id
    where p.status = 'authorized'
      and p.payout_due_at is not null
      and p.payout_completed_at is null
      and p.dispute_opened_at is null
  loop
    v_days_left := ceil(extract(epoch from (v_payment.payout_due_at - now())) / 86400.0)::int;

    if v_days_left in (3, 1) or v_days_left < 0 then
      select user_id into v_provider_user_id
      from public.vora_service_providers
      where id = v_payment.payee_provider_id;

      if v_provider_user_id is not null then
        insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
        values (
          v_provider_user_id,
          'vora_service_payout_reminder',
          case when v_days_left < 0 then 'Ödeme gecikti' else 'Ödeme yaklaşıyor' end,
          left(v_payment.title, 80) || case
            when v_days_left < 0 then ' · banka transferi gecikmiş olabilir'
            else ' · ' || v_days_left || ' gün içinde hesabınıza yatırılacak'
          end,
          jsonb_build_object(
            'payment_id', v_payment.id,
            'request_id', v_payment.request_id,
            'days_left', v_days_left,
            'deep_link', '/wallet'
          ),
          null
        );
        v_count := v_count + 1;
      end if;
    end if;
  end loop;

  return v_count;
end;
$$;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-vora-service-payout-reminders');
  perform cron.schedule(
    'process-vora-service-payout-reminders',
    '0 9 * * *',
    $job$select public.process_vora_service_payout_reminders()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; vora payout reminder manuel: %', sqlerrm;
end;
$cron$;

grant execute on function public.process_vora_service_payout_reminders() to service_role;
