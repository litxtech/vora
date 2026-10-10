-- AI müzik kapak görseli; yayınlanınca ses ve müzik kütüphanesine de yazılır

alter table public.ai_music_works
  add column if not exists cover_url text,
  add column if not exists cover_storage_path text;

create or replace function public.set_ai_music_cover(
  p_work_id uuid,
  p_cover_url text,
  p_cover_storage_path text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
  v_old text;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  if coalesce(trim(p_cover_url), '') = '' or coalesce(trim(p_cover_storage_path), '') = '' then
    raise exception 'Kapak gerekli';
  end if;

  if p_cover_storage_path not like auth.uid()::text || '/%' then
    raise exception 'Kapak bu hesaba ait değil';
  end if;

  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu parçayı yalnızca sahibi düzenleyebilir';
  end if;
  if v_work.status = 'generating' then
    raise exception 'Parça hazırlanırken kapak eklenemez';
  end if;

  v_old := v_work.cover_storage_path;

  update public.ai_music_works
  set
    cover_url = p_cover_url,
    cover_storage_path = p_cover_storage_path,
    updated_at = now()
  where id = p_work_id;

  if v_work.sound_id is not null then
    update public.sounds
    set
      cover_url = p_cover_url,
      cover_storage_path = p_cover_storage_path,
      updated_at = now()
    where id = v_work.sound_id;
  end if;

  return v_old;
end;
$$;

create or replace function public.publish_ai_music_work(p_work_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
  v_sound uuid;
  v_track uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu müziği yalnızca üreten hesap yayınlayabilir';
  end if;
  if v_work.status = 'published' and v_work.sound_id is not null then
    return v_work.sound_id;
  end if;
  if v_work.status <> 'ready' then
    raise exception 'Bu müzik kütüphaneye gönderilemez';
  end if;

  insert into public.sounds (
    author_id, title, description, cover_storage_path, cover_url,
    audio_storage_path, audio_url, duration_sec, privacy, status, tags
  ) values (
    v_work.author_id,
    v_work.title,
    v_work.rights_notice,
    v_work.cover_storage_path,
    v_work.cover_url,
    v_work.audio_storage_path,
    v_work.audio_url,
    v_work.duration_sec,
    'public',
    'published',
    array['ai-muzik', 'karadeniz', v_work.style]
  )
  returning id into v_sound;

  select id into v_track
  from public.music_tracks
  where source_sound_id = v_sound;

  if v_track is not null then
    update public.music_tracks
    set
      artist = 'Vora Karadeniz',
      album = 'Vora AI Müzik',
      license_info = v_work.rights_notice,
      license_status = 'licensed',
      publication_status = 'active',
      duration_seconds = v_work.duration_sec,
      cover_url = v_work.cover_url,
      cover_storage_path = v_work.cover_storage_path,
      updated_at = now()
    where id = v_track;
  end if;

  update public.ai_music_works
  set
    status = 'published',
    sound_id = v_sound,
    music_track_id = v_track,
    updated_at = now()
  where id = p_work_id;

  return v_sound;
end;
$$;

create or replace function public.delete_ai_music_work(p_work_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu parçayı yalnızca sahibi silebilir';
  end if;
  if v_work.status = 'generating' then
    raise exception 'Parça hazırlanırken silinemez';
  end if;

  if v_work.sound_id is not null then
    update public.sounds
    set status = 'removed', privacy = 'private', updated_at = now()
    where id = v_work.sound_id;
  end if;

  delete from public.ai_music_works where id = p_work_id;

  return jsonb_build_object(
    'audio_path', v_work.audio_storage_path,
    'reference_path', v_work.reference_storage_path,
    'cover_path', v_work.cover_storage_path
  );
end;
$$;

grant execute on function public.set_ai_music_cover(uuid, text, text) to authenticated;
grant execute on function public.publish_ai_music_work(uuid) to authenticated;
grant execute on function public.delete_ai_music_work(uuid) to authenticated;
