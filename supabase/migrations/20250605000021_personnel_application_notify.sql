-- Personel Merkezi: başvuru bildirimleri

-- Yeni başvuruda işverene bildirim
create or replace function public.notify_employer_new_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_title text;
begin
  if new.job_id is not null then
    select title into v_listing_title from public.job_listings where id = new.job_id;
  else
    select title into v_listing_title from public.staff_requests where id = new.staff_request_id;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  values (
    new.employer_id,
    'job'::public.notification_event_type,
    'Yeni başvuru',
    coalesce(left(v_listing_title, 80), 'İlanınıza yeni başvuru geldi'),
    jsonb_build_object(
      'application_id', new.id,
      'job_id', new.job_id,
      'staff_request_id', new.staff_request_id,
      'applicant_id', new.applicant_id
    )
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    new.employer_id,
    'job'::public.notification_event_type,
    'Yeni başvuru',
    coalesce(left(v_listing_title, 80), 'İlanınıza yeni başvuru geldi'),
    jsonb_build_object(
      'application_id', new.id,
      'job_id', new.job_id,
      'staff_request_id', new.staff_request_id,
      'applicant_id', new.applicant_id
    ),
    new.applicant_id
  );

  return new;
end;
$$;

drop trigger if exists job_application_notify_employer on public.job_applications;
create trigger job_application_notify_employer
  after insert on public.job_applications
  for each row execute function public.notify_employer_new_application();

-- Durum değişikliğinde adaya bildirim
create or replace function public.notify_applicant_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_listing_title text;
begin
  if old.status = new.status then
    return new;
  end if;

  if new.job_id is not null then
    select title into v_listing_title from public.job_listings where id = new.job_id;
  else
    select title into v_listing_title from public.staff_requests where id = new.staff_request_id;
  end if;

  v_title := case new.status
    when 'reviewing' then 'Başvurunuz inceleniyor'
    when 'interview' then 'Görüşme daveti'
    when 'accepted' then 'Başvurunuz kabul edildi'
    when 'rejected' then 'Başvurunuz reddedildi'
    else 'Başvuru güncellendi'
  end;

  v_body := coalesce(left(v_listing_title, 80), 'İş başvurunuz') || ' — ' ||
    case new.status
      when 'reviewing' then 'İnceleniyor'
      when 'interview' then 'Görüşme aşamasına geçildi'
      when 'accepted' then 'Kabul edildi'
      when 'rejected' then 'Reddedildi'
      else new.status::text
    end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  values (
    new.applicant_id,
    'job'::public.notification_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'application_id', new.id,
      'status', new.status,
      'job_id', new.job_id,
      'staff_request_id', new.staff_request_id
    )
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    new.applicant_id,
    'job'::public.notification_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'application_id', new.id,
      'status', new.status,
      'job_id', new.job_id,
      'staff_request_id', new.staff_request_id
    ),
    new.employer_id
  );

  return new;
end;
$$;

drop trigger if exists job_application_status_notify on public.job_applications;
create trigger job_application_status_notify
  after update of status on public.job_applications
  for each row execute function public.notify_applicant_status_change();
