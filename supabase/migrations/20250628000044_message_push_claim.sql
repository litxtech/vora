-- Mesaj push çift gönderimini önle (atomik claim)
-- Sorun: istemci (send-push-notification) ve outbox işleyici (process-notification-outbox)
-- aynı mesaj için neredeyse aynı anda "push_sent_at boş mu?" diye bakıp ikisi de push yolluyordu.
-- Çözüm: tek satırlık atomik UPDATE ile push'u kim önce sahiplenirse o gönderir; diğeri atlar.

create or replace function public.claim_message_push(
  p_recipient_id uuid,
  p_message_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.notification_outbox
  set
    data = jsonb_set(coalesce(data, '{}'::jsonb), '{push_sent_at}', to_jsonb(now()::text), true),
    processed_at = now(),
    claimed_at = null
  where recipient_id = p_recipient_id
    and event_type in ('message', 'group_message')
    and data->>'message_id' = p_message_id::text
    and (data->>'push_sent_at') is null
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Push teslimi başarısızsa sahiplenmeyi geri al ki işleyici tekrar denesin.
create or replace function public.release_message_push(
  p_recipient_id uuid,
  p_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set
    data = (coalesce(data, '{}'::jsonb) - 'push_sent_at'),
    processed_at = null,
    claimed_at = null
  where recipient_id = p_recipient_id
    and event_type in ('message', 'group_message')
    and data->>'message_id' = p_message_id::text;
end;
$$;

grant execute on function public.claim_message_push(uuid, uuid) to authenticated, service_role;
grant execute on function public.release_message_push(uuid, uuid) to authenticated, service_role;
