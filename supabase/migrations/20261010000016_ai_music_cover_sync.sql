-- Kapak, yayınlanmış parçanın müzik kaydına da yazılsın.

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

  update public.music_tracks
  set
    cover_url = p_cover_url,
    cover_storage_path = p_cover_storage_path,
    updated_at = now()
  where id = v_work.music_track_id
     or source_sound_id = v_work.sound_id;

  return v_old;
end;
$$;

grant execute on function public.set_ai_music_cover(uuid, text, text) to authenticated;
