-- Canlı Nabız: kullanıcıların yeni olay bildirmesi
-- incident_reports tablosuna normal kullanıcı insert'i yoktu; güvenli RPC ile ekliyoruz.
-- Konum (geography) sunucuda ST_MakePoint ile kurulur, böylece istemci geography formatı ile uğraşmaz.

create or replace function public.create_incident_report(
  p_title text,
  p_description text,
  p_region_id text,
  p_severity public.incident_severity default 'medium',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_media_urls text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Olay bildirmek için giriş yapmalısınız.';
  end if;

  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Başlık boş olamaz.';
  end if;

  if coalesce(btrim(p_description), '') = '' then
    raise exception 'Açıklama boş olamaz.';
  end if;

  if not exists (select 1 from public.regions r where r.id = p_region_id) then
    raise exception 'Geçersiz bölge.';
  end if;

  insert into public.incident_reports (
    reporter_id,
    region_id,
    title,
    description,
    severity,
    media_urls,
    location
  )
  values (
    v_uid,
    p_region_id,
    btrim(p_title),
    btrim(p_description),
    coalesce(p_severity, 'medium'),
    coalesce(p_media_urls, '{}'),
    case
      when p_latitude is not null and p_longitude is not null
        then st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
      else null
    end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_incident_report(
  text, text, text, public.incident_severity, double precision, double precision, text[]
) to authenticated;
