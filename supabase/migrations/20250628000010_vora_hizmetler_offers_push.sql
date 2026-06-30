-- Teklif bildirimleri: yeni teklif, red, kabul sonrası ödeme hatırlatması

alter type public.notification_event_type add value if not exists 'vora_service_offer_rejected';

-- Yeni teklif veya red sonrası yeniden teklif → talep sahibine push
create or replace function public.notify_vora_service_offer_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_request record;
  v_provider record;
  v_data jsonb;
  v_body text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then return new; end if;
  elsif tg_op = 'UPDATE' then
    if not (new.status = 'pending' and old.status in ('rejected', 'withdrawn')) then
      return new;
    end if;
  else
    return new;
  end if;

  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  select r.id, r.title, r.requester_id
  into v_request
  from public.vora_service_requests r
  where r.id = new.request_id;

  if v_request.requester_id is null then return new; end if;

  select sp.user_id, sp.display_name
  into v_provider
  from public.vora_service_providers sp
  where sp.id = new.provider_id;

  v_data := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'offer_id', new.id,
    'deep_link', '/detail/vora-hizmetler/request/' || v_request.id::text
  );

  v_body := coalesce(v_provider.display_name, 'Usta')
    || ' · '
    || trim(to_char(new.price, 'FM999G999G999D00'))
    || ' ₺ teklif';

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_request.requester_id,
    'vora_service_offer_received',
    'Yeni teklif',
    v_body,
    v_data,
    v_provider.user_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_request.requester_id,
    'vora_service_offer_received',
    'Yeni teklif',
    coalesce(v_provider.display_name, 'Usta') || ' teklif gönderdi',
    v_data,
    v_provider.user_id,
    'jobs',
    'high'
  );

  return new;
end;
$$;

drop trigger if exists vora_service_offer_received_notify on public.vora_service_offers;
create trigger vora_service_offer_received_notify
  after insert on public.vora_service_offers
  for each row execute function public.notify_vora_service_offer_received();

drop trigger if exists vora_service_offer_revised_notify on public.vora_service_offers;
create trigger vora_service_offer_revised_notify
  after update of status on public.vora_service_offers
  for each row execute function public.notify_vora_service_offer_received();

-- Teklif reddedildi → ustaya push (yeniden teklif verebilsin)
create or replace function public.notify_vora_service_offer_rejected()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_request record;
  v_provider record;
  v_data jsonb;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if new.status <> 'rejected' or old.status = 'rejected' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  select r.id, r.title, r.requester_id
  into v_request
  from public.vora_service_requests r
  where r.id = new.request_id;

  select sp.user_id, sp.display_name
  into v_provider
  from public.vora_service_providers sp
  where sp.id = new.provider_id;

  if v_provider.user_id is null then return new; end if;

  v_data := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'offer_id', new.id,
    'deep_link', '/vora-hizmetler?tab=offers'
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_provider.user_id,
    'vora_service_offer_rejected',
    'Teklif reddedildi',
    left(v_request.title, 120) || ' — yeni teklif gönderebilirsiniz',
    v_data,
    v_request.requester_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_provider.user_id,
    'vora_service_offer_rejected',
    'Teklif reddedildi',
    'Beğenilmedi — güncellenmiş teklif gönderebilirsiniz',
    v_data,
    v_request.requester_id,
    'jobs',
    'normal'
  );

  return new;
end;
$$;

drop trigger if exists vora_service_offer_rejected_notify on public.vora_service_offers;
create trigger vora_service_offer_rejected_notify
  after update of status on public.vora_service_offers
  for each row execute function public.notify_vora_service_offer_rejected();

-- Kabul sonrası talep sahibine ödeme hatırlatması
create or replace function public.notify_vora_service_offer_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_request record;
  v_provider record;
  v_data_requester jsonb;
  v_data_provider jsonb;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if new.status <> 'offer_accepted' or old.status = 'offer_accepted' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  select r.id, r.title, r.requester_id, r.accepted_provider_id
  into v_request
  from public.vora_service_requests r
  where r.id = new.id;

  if v_request.accepted_provider_id is null then return new; end if;

  select sp.id, sp.user_id, sp.display_name
  into v_provider
  from public.vora_service_providers sp
  where sp.id = v_request.accepted_provider_id;

  v_data_requester := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'action', 'pay',
    'deep_link', '/detail/vora-hizmetler/request/' || v_request.id::text || '?pay=1'
  );

  v_data_provider := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'deep_link', '/detail/vora-hizmetler/request/' || v_request.id::text
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values
    (
      v_request.requester_id,
      'vora_service_offer_accepted',
      'Teklif kabul edildi — ödeme',
      coalesce(v_provider.display_name, 'Usta') || ' ile anlaştınız. Ödemeyi tamamlayın.',
      v_data_requester,
      v_provider.user_id
    ),
    (
      v_provider.user_id,
      'vora_service_offer_accepted',
      'Teklifiniz kabul edildi',
      left(v_request.title, 120),
      v_data_provider,
      v_request.requester_id
    );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values
    (
      v_request.requester_id,
      'vora_service_offer_accepted',
      'Ödeme bekleniyor',
      coalesce(v_provider.display_name, 'Usta') || ' · Öde butonuna dokunun',
      v_data_requester,
      v_provider.user_id,
      'jobs',
      'high'
    ),
    (
      v_provider.user_id,
      'vora_service_offer_accepted',
      'Teklifiniz kabul edildi',
      left(v_request.title, 120),
      v_data_provider,
      v_request.requester_id,
      'jobs',
      'high'
    );

  return new;
end;
$$;

drop trigger if exists vora_service_offer_accepted_notify on public.vora_service_requests;
create trigger vora_service_offer_accepted_notify
  after update of status on public.vora_service_requests
  for each row execute function public.notify_vora_service_offer_accepted();
