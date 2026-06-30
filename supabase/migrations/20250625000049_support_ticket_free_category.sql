-- Destek talebi kategorisi: sabit liste yerine serbest metin

alter table public.support_tickets
  drop constraint if exists support_tickets_category_check;

alter table public.support_tickets
  add constraint support_tickets_category_check
  check (char_length(trim(category)) between 2 and 80);

create or replace function public.submit_support_ticket(
  p_category text,
  p_subject text,
  p_message text,
  p_lifecycle_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
  v_category text := trim(p_category);
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if char_length(v_category) < 2 then
    raise exception 'Kategori en az 2 karakter olmalıdır';
  end if;

  if char_length(v_category) > 80 then
    raise exception 'Kategori en fazla 80 karakter olabilir';
  end if;

  if char_length(trim(p_subject)) < 3 then
    raise exception 'Konu en az 3 karakter olmalıdır';
  end if;

  if char_length(trim(p_message)) < 10 then
    raise exception 'Mesaj en az 10 karakter olmalıdır';
  end if;

  insert into public.support_tickets (
    user_id, category, subject, message, lifecycle_request_id
  )
  values (
    v_user_id,
    v_category,
    trim(p_subject),
    trim(p_message),
    p_lifecycle_request_id
  )
  returning id into v_ticket_id;

  perform public.notify_user_system(
    v_user_id,
    'Destek talebiniz alındı',
    'Talebiniz destek ekibine iletildi. İncelendiğinde bilgilendirileceksiniz.',
    jsonb_build_object('kind', 'support_ticket_received', 'ticket_id', v_ticket_id, 'status', 'open'),
    'normal'
  );

  perform public.notify_admins_account_lifecycle(
    'Yeni destek talebi',
    trim(p_subject) || ': ' || left(trim(p_message), 100),
    jsonb_build_object('ticket_id', v_ticket_id, 'kind', 'support_ticket')
  );

  return v_ticket_id;
end;
$$;
