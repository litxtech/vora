-- Usta profilinin kişisel profilde gösterimi + talep düzenleme/kaldırma kuralları

alter table public.vora_service_providers
  add column if not exists show_on_profile boolean not null default true;

comment on column public.vora_service_providers.show_on_profile is
  'false ise usta kartı kullanıcının sosyal profilinde ziyaretçilere gösterilmez';

-- Talep sahibi yalnızca teklif bekleyen ilanları düzenleyebilir / iptal edebilir
create or replace function public.enforce_vora_service_request_requester_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> old.requester_id then
    return new;
  end if;

  if old.status <> 'pending_offers' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.urgency is distinct from old.urgency
      or new.budget_min is distinct from old.budget_min
      or new.budget_max is distinct from old.budget_max
      or new.city is distinct from old.city
      or new.image_urls is distinct from old.image_urls
      or new.is_emergency is distinct from old.is_emergency then
      raise exception 'vora_service_request_not_editable';
    end if;
  end if;

  if new.status = 'cancelled' and old.status <> 'pending_offers' then
    raise exception 'vora_service_request_not_cancellable';
  end if;

  return new;
end;
$$;

drop trigger if exists vora_service_requests_requester_edit_guard on public.vora_service_requests;

create trigger vora_service_requests_requester_edit_guard
  before update on public.vora_service_requests
  for each row
  execute function public.enforce_vora_service_request_requester_edit();
