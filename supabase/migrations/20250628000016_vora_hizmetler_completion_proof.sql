-- İş bitim kanıtı — usta opsiyonel fotoğraf / video paylaşır

alter type public.notification_event_type add value if not exists 'vora_service_completion_proof';

alter table public.vora_service_requests
  add column if not exists completion_proof_image_url text,
  add column if not exists completion_proof_video_url text,
  add column if not exists completion_proof_submitted_at timestamptz;

create or replace function public.submit_vora_service_completion_proof(
  p_request_id uuid,
  p_image_url text default null,
  p_video_url text default null
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
    return jsonb_build_object('error', 'Yalnızca atanmış usta kanıt gönderebilir');
  end if;

  if v_request.status not in ('en_route', 'in_progress') then
    return jsonb_build_object('error', 'Bu adım şu an yapılamaz');
  end if;

  update public.vora_service_requests
  set
    completion_proof_image_url = nullif(trim(p_image_url), ''),
    completion_proof_video_url = nullif(trim(p_video_url), ''),
    completion_proof_submitted_at = now(),
    updated_at = now()
  where id = p_request_id;

  insert into public.vora_service_status_log (request_id, status, note)
  values (
    p_request_id,
    v_request.status,
    case
      when nullif(trim(p_image_url), '') is not null and nullif(trim(p_video_url), '') is not null
        then 'Usta iş bitim kanıtı (fotoğraf + video) paylaştı'
      when nullif(trim(p_image_url), '') is not null
        then 'Usta iş bitim kanıtı (fotoğraf) paylaştı'
      when nullif(trim(p_video_url), '') is not null
        then 'Usta iş bitim kanıtı (video) paylaştı'
      else 'Usta işi tamamladığını bildirdi'
    end
  );

  v_data := jsonb_build_object(
    'service_request_id', p_request_id,
    'request_id', p_request_id,
    'deep_link', '/detail/vora-hizmetler/request/' || p_request_id::text
  );

  v_body :=
    coalesce(v_provider.display_name, 'Usta')
    || ' iş bitim kanıtını paylaştı. Memnunsanız '
    || 'İş Bitti'
    || ' diyerek onaylayın.';

  if public.is_vora_hizmetler_push_enabled() then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      v_request.requester_id,
      'vora_service_completion_proof',
      'İş bitim kanıtı',
      v_body,
      v_data,
      v_provider.user_id
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_request.requester_id,
      'vora_service_completion_proof',
      'İş bitim kanıtı geldi',
      v_body,
      v_data,
      v_provider.user_id,
      'jobs',
      'high'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_vora_service_completion_proof(uuid, text, text) to authenticated;
