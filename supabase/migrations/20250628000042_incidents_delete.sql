-- Canlı Nabız: olay kaldırma
-- Sahibi (reporter) veya moderatör/admin olayı silebilir. Bağlı update/verification kayıtları
-- cascade ile zaten temizlenir.

create or replace function public.delete_incident_report(p_incident_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reporter uuid;
begin
  if v_uid is null then
    raise exception 'Olay kaldırmak için giriş yapmalısınız.';
  end if;

  select reporter_id into v_reporter
  from public.incident_reports
  where id = p_incident_id;

  if v_reporter is null then
    raise exception 'Olay bulunamadı.';
  end if;

  if v_reporter <> v_uid and not public.is_moderator() then
    raise exception 'Bu olayı kaldırma yetkiniz yok.';
  end if;

  delete from public.incident_reports where id = p_incident_id;
end;
$$;

grant execute on function public.delete_incident_report(uuid) to authenticated;
