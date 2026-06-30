-- Canlı konum — usta yolda / iş başladı

alter type public.notification_event_type add value if not exists 'vora_service_live_location_shared';

create table if not exists public.vora_service_live_locations (
  request_id uuid primary key references public.vora_service_requests (id) on delete cascade,
  provider_id uuid not null references public.vora_service_providers (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  eta_minutes int,
  updated_at timestamptz not null default now()
);

create index if not exists vora_service_live_locations_provider_idx
  on public.vora_service_live_locations (provider_id, updated_at desc);

alter table public.vora_service_live_locations enable row level security;

create policy vora_service_live_locations_select on public.vora_service_live_locations
  for select using (
    exists (
      select 1 from public.vora_service_requests r
      where r.id = request_id
        and (
          r.requester_id = auth.uid()
          or r.accepted_provider_id in (
            select id from public.vora_service_providers where user_id = auth.uid()
          )
        )
    )
  );

create or replace function public.upsert_vora_service_live_location(
  p_request_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_heading double precision default null,
  p_eta_minutes int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.vora_service_requests%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_is_first boolean := false;
  v_data jsonb;
begin
  select * into v_request
  from public.vora_service_requests
  where id = p_request_id;

  if not found then
    return jsonb_build_object('error', 'Talep bulunamadı');
  end if;

  if v_request.status not in ('en_route', 'in_progress') then
    return jsonb_build_object('error', 'Canlı konum bu aşamada paylaşılamaz');
  end if;

  select * into v_provider
  from public.vora_service_providers
  where id = v_request.accepted_provider_id
    and user_id = auth.uid();

  if not found then
    return jsonb_build_object('error', 'Yalnızca atanmış usta konum paylaşabilir');
  end if;

  select not exists (
    select 1 from public.vora_service_live_locations where request_id = p_request_id
  ) into v_is_first;

  insert into public.vora_service_live_locations (
    request_id, provider_id, latitude, longitude, heading, eta_minutes, updated_at
  )
  values (
    p_request_id, v_provider.id, p_latitude, p_longitude, p_heading, p_eta_minutes, now()
  )
  on conflict (request_id) do update
  set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    heading = excluded.heading,
    eta_minutes = excluded.eta_minutes,
    updated_at = now();

  if v_is_first and public.is_vora_hizmetler_push_enabled() then
    v_data := jsonb_build_object(
      'request_id', p_request_id,
      'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
    );

    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_request.requester_id,
      'vora_service_live_location_shared',
      'Usta konum paylaştı',
      v_provider.display_name || ' yola çıktı · haritadan takip edebilirsiniz',
      v_data,
      v_provider.user_id
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.upsert_vora_service_live_location(uuid, double precision, double precision, double precision, int) to authenticated;

create or replace function public.clear_vora_service_live_location(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.vora_service_live_locations where request_id = p_request_id;
end;
$$;

-- İş tamamlanınca canlı konumu temizle
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

  if v_payment.dispute_opened_at is not null and v_payment.refunded_at is null then
    return jsonb_build_object('error', 'Açık itiraz var — önce çözülmeli');
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

  perform public.clear_vora_service_live_location(p_request_id);

  insert into public.vora_service_status_log (request_id, status, note)
  values (p_request_id, 'completed', 'Müşteri işi tamamladı · usta ödemesi planlandı');

  if v_provider.id is not null then
    perform public.refresh_vora_service_provider_metrics(v_provider.id);
  end if;

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
        v_data || jsonb_build_object('deep_link', '/vora-hizmetler?tab=active'),
        v_request.requester_id
      );
  end if;

  return jsonb_build_object(
    'ok', true,
    'payout_due_at', v_due,
    'provider_net_cents', v_payment.provider_net_cents
  );
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.vora_service_live_locations;
exception
  when duplicate_object then null;
  when others then
    raise notice 'realtime live_locations: %', sqlerrm;
end;
$$;
