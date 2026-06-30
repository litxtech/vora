-- Outbox claim push gönderilmeden processed_at işaretliyordu; mesaj push'ları takılıyordu.
-- push_sent_at olmayan işlenmiş mesaj kayıtlarını yeniden kuyruğa al.

update public.notification_outbox
set processed_at = null
where event_type in ('message', 'group_message')
  and processed_at is not null
  and coalesce(data->>'push_sent_at', '') = ''
  and created_at > now() - interval '14 days';

notify pgrst, 'reload schema';
