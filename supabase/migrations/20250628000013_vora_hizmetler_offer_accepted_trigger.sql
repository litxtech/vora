-- Kabul sonrası ödeme hatırlatması trigger (010'da eksik kalmıştı)

drop trigger if exists vora_service_offer_accepted_notify on public.vora_service_requests;
create trigger vora_service_offer_accepted_notify
  after update of status on public.vora_service_requests
  for each row execute function public.notify_vora_service_offer_accepted();
