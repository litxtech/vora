-- Caps video süre toleransı: encode sapması için 4.5 sn

alter table public.caps
  drop constraint if exists caps_duration_ms_nonneg;

alter table public.caps
  drop constraint if exists caps_duration_max;

alter table public.caps
  add constraint caps_duration_ms_range
  check (duration_ms is null or (duration_ms > 0 and duration_ms <= 4500));

create or replace function public.create_cap(
  p_image_url text,
  p_storage_path text,
  p_thumb_url text default null,
  p_title text default null,
  p_width integer default null,
  p_height integer default null,
  p_video_url text default null,
  p_duration_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
  v_has_image boolean;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  v_has_image := p_image_url is not null and length(trim(p_image_url)) > 0;
  if not v_has_image then
    raise exception 'Caps için poster / resim URL gerekli';
  end if;

  if p_duration_ms is not null and (p_duration_ms <= 0 or p_duration_ms > 4500) then
    raise exception 'Caps videosu en fazla 3 saniye olabilir';
  end if;

  select count(*)::integer into v_count
  from public.caps
  where creator_id = auth.uid() and status = 'published';

  if v_count >= 50 then
    raise exception 'En fazla 50 caps oluşturabilirsiniz';
  end if;

  insert into public.caps (
    creator_id, title, image_url, storage_path, thumb_url, video_url, duration_ms, width, height, status
  )
  values (
    auth.uid(),
    nullif(trim(p_title), ''),
    p_image_url,
    p_storage_path,
    p_thumb_url,
    nullif(trim(coalesce(p_video_url, '')), ''),
    p_duration_ms,
    p_width,
    p_height,
    'published'
  )
  returning id into v_id;

  insert into public.user_cap_library (user_id, cap_id, source)
  values (auth.uid(), v_id, 'created')
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.create_cap(text, text, text, text, integer, integer, text, integer)
  to authenticated;
