-- Vora Caps Studio: meta referans (yeniden encode yok)

alter table public.caps
  add column if not exists source_kind text,
  add column if not exists source_video_id uuid references public.videos(id) on delete set null,
  add column if not exists start_ms integer,
  add column if not exists end_ms integer,
  add column if not exists overlay jsonb not null default '{}'::jsonb;

alter table public.caps
  drop constraint if exists caps_source_kind_check;

alter table public.caps
  add constraint caps_source_kind_check
  check (
    source_kind is null
    or source_kind in ('photo', 'local_video', 'vora_video')
  );

alter table public.caps
  drop constraint if exists caps_clip_range_check;

alter table public.caps
  add constraint caps_clip_range_check
  check (
    start_ms is null
    or end_ms is null
    or (start_ms >= 0 and end_ms > start_ms and (end_ms - start_ms) <= 10500)
  );

alter table public.caps
  drop constraint if exists caps_duration_ms_range;

alter table public.caps
  drop constraint if exists caps_duration_ms_nonneg;

alter table public.caps
  drop constraint if exists caps_duration_max;

alter table public.caps
  add constraint caps_duration_ms_range
  check (duration_ms is null or (duration_ms > 0 and duration_ms <= 10500));

-- storage_path Vora referanslı caps'te boş olabilir
alter table public.caps
  alter column storage_path drop not null;

create index if not exists caps_source_video_idx
  on public.caps (source_video_id)
  where source_video_id is not null;

drop function if exists public.create_cap(text, text, text, text, integer, integer, text, integer);

create or replace function public.create_cap(
  p_image_url text,
  p_storage_path text default null,
  p_thumb_url text default null,
  p_title text default null,
  p_width integer default null,
  p_height integer default null,
  p_video_url text default null,
  p_duration_ms integer default null,
  p_source_kind text default null,
  p_source_video_id uuid default null,
  p_start_ms integer default null,
  p_end_ms integer default null,
  p_overlay jsonb default '{}'::jsonb
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
  v_has_video boolean;
  v_clip_ms integer;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  v_has_image := p_image_url is not null and length(trim(p_image_url)) > 0;
  v_has_video := (p_video_url is not null and length(trim(p_video_url)) > 0)
    or p_source_video_id is not null;

  if not v_has_image and not v_has_video then
    raise exception 'Caps için resim veya video gerekli';
  end if;

  if not v_has_image then
    raise exception 'Caps için poster / resim URL gerekli';
  end if;

  if p_source_kind is not null
     and p_source_kind not in ('photo', 'local_video', 'vora_video') then
    raise exception 'Geçersiz caps kaynak türü';
  end if;

  if p_source_video_id is not null then
    if not exists (
      select 1 from public.videos v
      where v.id = p_source_video_id
        and v.owner_id = auth.uid()
        and v.status = 'ready'
    ) then
      raise exception 'Vora videosu bulunamadı veya size ait değil';
    end if;
  end if;

  if p_start_ms is not null and p_end_ms is not null then
    v_clip_ms := p_end_ms - p_start_ms;
    if p_start_ms < 0 or v_clip_ms <= 0 or v_clip_ms > 10500 then
      raise exception 'Caps aralığı 1–10 saniye olmalıdır';
    end if;
  end if;

  if p_duration_ms is not null and (p_duration_ms <= 0 or p_duration_ms > 10500) then
    raise exception 'Caps videosu en fazla 10 saniye olabilir';
  end if;

  select count(*)::integer into v_count
  from public.caps
  where creator_id = auth.uid() and status = 'published';

  if v_count >= 50 then
    raise exception 'En fazla 50 caps oluşturabilirsiniz';
  end if;

  insert into public.caps (
    creator_id, title, image_url, storage_path, thumb_url, video_url, duration_ms,
    width, height, source_kind, source_video_id, start_ms, end_ms, overlay, status
  )
  values (
    auth.uid(),
    nullif(trim(p_title), ''),
    p_image_url,
    nullif(trim(coalesce(p_storage_path, '')), ''),
    p_thumb_url,
    nullif(trim(coalesce(p_video_url, '')), ''),
    coalesce(p_duration_ms, case when p_start_ms is not null and p_end_ms is not null
      then p_end_ms - p_start_ms else null end),
    p_width,
    p_height,
    p_source_kind,
    p_source_video_id,
    p_start_ms,
    p_end_ms,
    coalesce(p_overlay, '{}'::jsonb),
    'published'
  )
  returning id into v_id;

  insert into public.user_cap_library (user_id, cap_id, source)
  values (auth.uid(), v_id, 'created')
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.create_cap(
  text, text, text, text, integer, integer, text, integer, text, uuid, integer, integer, jsonb
) to authenticated;
