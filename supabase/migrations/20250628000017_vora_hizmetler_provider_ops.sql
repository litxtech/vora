-- Usta operasyonları: durum geçişi, istatistik, rozet, teklif geri çekme

alter type public.notification_event_type add value if not exists 'vora_service_job_started';

-- ─── İstatistik + rozet senkronu ─────────────────────────────────────────────

create or replace function public.refresh_vora_service_provider_stats(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed int;
  v_total int;
  v_response_minutes int;
begin
  select count(*)::int into v_completed
  from public.vora_service_requests
  where accepted_provider_id = p_provider_id
    and status in ('completed', 'rated');

  select count(*)::int into v_total
  from public.vora_service_requests
  where accepted_provider_id = p_provider_id
    and status not in ('pending_offers', 'cancelled');

  select coalesce(
    avg(
      extract(epoch from (r.updated_at - o.created_at)) / 60.0
    )::int,
    null
  )
  into v_response_minutes
  from public.vora_service_offers o
  join public.vora_service_requests r on r.id = o.request_id
  where o.provider_id = p_provider_id
    and o.status = 'accepted';

  update public.vora_service_providers
  set
    completed_jobs = v_completed,
    completion_rate = case
      when v_total = 0 then 100
      else round((v_completed::numeric / v_total::numeric) * 100, 2)
    end,
    response_minutes = v_response_minutes,
    updated_at = now()
  where id = p_provider_id;
end;
$$;

create or replace function public.refresh_vora_service_provider_badges(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vora_service_providers%rowtype;
  v_badges public.vora_service_badge[] := '{}';
begin
  select * into v_row
  from public.vora_service_providers
  where id = p_provider_id;

  if not found then
    return;
  end if;

  if v_row.identity_verified and v_row.workplace_verified then
    v_badges := array_append(v_badges, 'verified'::public.vora_service_badge);
  end if;

  if v_row.is_premium then
    v_badges := array_append(v_badges, 'premium'::public.vora_service_badge);
  end if;

  if v_row.rating >= 4.5 and v_row.review_count >= 3 then
    v_badges := array_append(v_badges, 'top_choice'::public.vora_service_badge);
  end if;

  if v_row.rating >= 4.8 and v_row.completed_jobs >= 10 then
    v_badges := array_append(v_badges, 'best_service'::public.vora_service_badge);
  end if;

  if v_row.response_minutes is not null and v_row.response_minutes <= 30 then
    v_badges := array_append(v_badges, 'fast_response'::public.vora_service_badge);
  end if;

  update public.vora_service_providers
  set badges = v_badges, updated_at = now()
  where id = p_provider_id;
end;
$$;

create or replace function public.refresh_vora_service_provider_metrics(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_vora_service_provider_stats(p_provider_id);
  perform public.refresh_vora_service_provider_badges(p_provider_id);
end;
$$;

-- Doğrulama güncellenince rozetleri yenile
create or replace function public.sync_vora_service_provider_verification(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id uuid;
  v_phone_verified boolean := false;
  v_identity_verified boolean := false;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select coalesce(phone_confirmed_at is not null, false)
  into v_phone_verified
  from auth.users
  where id = p_user_id;

  select coalesce(is_verified, false)
  into v_identity_verified
  from public.profiles
  where id = p_user_id;

  update public.vora_service_providers
  set
    phone_verified = v_phone_verified,
    identity_verified = v_identity_verified,
    updated_at = now()
  where user_id = p_user_id
  returning id into v_provider_id;

  if v_provider_id is not null then
    perform public.refresh_vora_service_provider_badges(v_provider_id);
  end if;
end;
$$;

create or replace function public.set_vora_service_workplace_verified(
  p_provider_id uuid,
  p_verified boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.vora_service_providers
    where id = p_provider_id
      and user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.vora_service_providers
  set workplace_verified = p_verified, updated_at = now()
  where id = p_provider_id;

  perform public.refresh_vora_service_provider_badges(p_provider_id);
end;
$$;

-- ─── Usta durum geçişi ───────────────────────────────────────────────────────

create or replace function public.advance_vora_service_job_status(
  p_request_id uuid,
  p_next_status public.vora_service_request_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.vora_service_requests%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_data jsonb;
  v_note text;
  v_title text;
  v_body text;
begin
  select * into v_request
  from public.vora_service_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Talep bulunamadı');
  end if;

  if v_request.accepted_provider_id is null then
    return jsonb_build_object('error', 'Atanmış usta yok');
  end if;

  select * into v_provider
  from public.vora_service_providers
  where id = v_request.accepted_provider_id;

  if v_provider.user_id <> auth.uid() then
    return jsonb_build_object('error', 'Yalnızca atanmış usta durumu güncelleyebilir');
  end if;

  if p_next_status = 'in_progress' and v_request.status <> 'en_route' then
    return jsonb_build_object('error', 'Önce yola çıkılmış olmalı');
  end if;

  if p_next_status <> 'in_progress' then
    return jsonb_build_object('error', 'Geçersiz durum geçişi');
  end if;

  if not exists (
    select 1
    from public.vora_service_payments
    where request_id = p_request_id
      and status = 'authorized'
  ) then
    return jsonb_build_object('error', 'Ödeme henüz tamamlanmadı');
  end if;

  update public.vora_service_requests
  set status = p_next_status, updated_at = now()
  where id = p_request_id;

  v_note := 'Usta işe başladı';
  insert into public.vora_service_status_log (request_id, status, note)
  values (p_request_id, p_next_status, v_note);

  v_data := jsonb_build_object(
    'service_request_id', p_request_id,
    'request_id', p_request_id,
    'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
  );

  v_title := 'İş başladı';
  v_body := coalesce(v_provider.display_name, 'Usta') || ' · ' || left(v_request.title, 100);

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_request.requester_id,
      'vora_service_job_started',
      v_title,
      v_body,
      v_data,
      v_provider.user_id
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_request.requester_id,
      'vora_service_job_started',
      v_title,
      v_body,
      v_data,
      v_provider.user_id,
      'jobs',
      'normal'
    );
  end if;

  return jsonb_build_object('ok', true, 'status', p_next_status);
end;
$$;

grant execute on function public.advance_vora_service_job_status(uuid, public.vora_service_request_status) to authenticated;

-- ─── Teklif geri çekme ───────────────────────────────────────────────────────

create or replace function public.withdraw_vora_service_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.vora_service_offers%rowtype;
begin
  select * into v_offer
  from public.vora_service_offers
  where id = p_offer_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Teklif bulunamadı');
  end if;

  if not exists (
    select 1
    from public.vora_service_providers
    where id = v_offer.provider_id
      and user_id = auth.uid()
  ) then
    return jsonb_build_object('error', 'Bu teklifi geri çekemezsiniz');
  end if;

  if v_offer.status <> 'pending' then
    return jsonb_build_object('error', 'Yalnızca bekleyen teklifler geri çekilebilir');
  end if;

  update public.vora_service_offers
  set status = 'withdrawn', updated_at = now()
  where id = p_offer_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.withdraw_vora_service_offer(uuid) to authenticated;

-- ─── İş tamamlanınca istatistik güncelle ────────────────────────────────────

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
        v_data || jsonb_build_object('deep_link', '/vora-hizmetler?tab=active'),
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

-- Mevcut ustalar için ilk senkron
do $$
declare
  v_provider_id uuid;
begin
  for v_provider_id in select id from public.vora_service_providers loop
    perform public.refresh_vora_service_provider_metrics(v_provider_id);
  end loop;
end;
$$;

-- Değerlendirme sonrası rozetleri de güncelle
create or replace function public.refresh_vora_service_provider_rating(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3,2);
  v_count int;
begin
  select
    coalesce(
      avg(
        (quality + punctuality + cleanliness + value_for_money + communication)::numeric / 5.0
      ),
      0
    ),
    count(*)::int
  into v_avg, v_count
  from public.vora_service_reviews
  where provider_id = p_provider_id;

  update public.vora_service_providers
  set
    rating = round(greatest(0, least(5, v_avg)), 2),
    review_count = v_count,
    updated_at = now()
  where id = p_provider_id;

  perform public.refresh_vora_service_provider_badges(p_provider_id);
end;
$$;
