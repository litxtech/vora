-- Push bildirim açılma/tıklama takibi (admin istatistikleri için)

create or replace function public.mark_notification_delivery_opened(p_outbox_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_outbox_id is null then
    return;
  end if;

  update public.notification_delivery_log
  set
    opened_at = coalesce(opened_at, now()),
    clicked_at = now()
  where outbox_id = p_outbox_id
    and recipient_id = auth.uid();
end;
$$;

grant execute on function public.mark_notification_delivery_opened(uuid) to authenticated;
