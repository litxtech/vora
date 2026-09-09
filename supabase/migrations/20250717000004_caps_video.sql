-- Caps: video (max ~3 sn) desteği

alter table public.caps
  add column if not exists video_url text,
  add column if not exists duration_ms integer;

alter table public.caps
  drop constraint if exists caps_duration_ms_nonneg;

alter table public.caps
  add constraint caps_duration_ms_nonneg
  check (duration_ms is null or (duration_ms > 0 and duration_ms <= 3500));

-- Storage: kısa video + poster
update storage.buckets
set
  file_size_limit = 8388608,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id = 'caps';

drop function if exists public.create_cap(text, text, text, text, integer, integer);

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
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select count(*)::integer into v_count
  from public.caps
  where creator_id = auth.uid() and status = 'published';

  if v_count >= 50 then
    raise exception 'En fazla 50 caps oluşturabilirsiniz';
  end if;

  if p_video_url is null or length(trim(p_video_url)) = 0 then
    raise exception 'Caps video gerektirir';
  end if;

  if p_duration_ms is not null and p_duration_ms > 3500 then
    raise exception 'Caps videosu en fazla 3 saniye olabilir';
  end if;

  insert into public.caps (
    creator_id, title, image_url, storage_path, thumb_url, width, height,
    video_url, duration_ms, status
  )
  values (
    auth.uid(),
    nullif(trim(p_title), ''),
    p_image_url,
    p_storage_path,
    p_thumb_url,
    p_width,
    p_height,
    nullif(trim(p_video_url), ''),
    p_duration_ms,
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
