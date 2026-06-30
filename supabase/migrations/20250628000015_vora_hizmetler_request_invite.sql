-- Müşteri, ilanı üzerinden ustaya davet gönderebilir

alter type public.notification_event_type add value if not exists 'vora_service_request_invite';

create or replace function public.invite_vora_provider_to_request(
  p_request_id uuid,
  p_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.vora_service_requests%rowtype;
  v_provider public.vora_service_providers%rowtype;
  v_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_request
  from public.vora_service_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'request_not_found';
  end if;

  if v_request.requester_id <> auth.uid() then
    raise exception 'not_request_owner';
  end if;

  if v_request.status <> 'pending_offers' then
    raise exception 'request_not_open';
  end if;

  select * into v_provider
  from public.vora_service_providers
  where id = p_provider_id and is_active = true;

  if v_provider.id is null then
    raise exception 'provider_not_found';
  end if;

  if v_provider.user_id = auth.uid() then
    raise exception 'cannot_invite_self';
  end if;

  v_data := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'provider_id', v_provider.id,
    'deep_link', '/vora-hizmetler/submit-offer/' || v_request.id::text
  );

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_provider.user_id,
      'vora_service_request_invite',
      'İş daveti',
      'Bir müşteri sizi "' || left(v_request.title, 40) || '" ilanına teklif vermeye davet etti.',
      v_data,
      auth.uid()
    );
  end if;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values (
    v_provider.user_id,
    'vora_service_request_invite',
    'İş daveti',
    'İlanınıza teklif vermeniz isteniyor: ' || v_request.title,
    v_data,
    auth.uid(),
    'jobs',
    'high'
  );
end;
$$;

revoke all on function public.invite_vora_provider_to_request(uuid, uuid) from public;
grant execute on function public.invite_vora_provider_to_request(uuid, uuid) to authenticated;
