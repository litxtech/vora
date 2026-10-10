-- Onay ve kütüphane ayrı adımlar. Dakika yalnızca onayda düşer.

alter table public.ai_music_works
  add column if not exists approved_at timestamptz;

create or replace function public.approve_ai_music_work(p_work_id uuid)
returns void
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

  select * into v_work from public.ai_music_works where id = p_work_id for update;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu parçayı yalnızca sahibi onaylayabilir';
  end if;
  if v_work.approved_at is not null then
    return;
  end if;
  if v_work.status <> 'ready' or v_work.audio_url is null then
    raise exception 'Parça onaylanmaya hazır değil';
  end if;

  perform public.charge_ai_music_on_approve(p_work_id);

  update public.ai_music_works
  set approved_at = now(), updated_at = now()
  where id = p_work_id;
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
  if v_work.approved_at is null then
    raise exception 'Önce parçayı onayla';
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

update public.ai_music_works w
set approved_at = coalesce(w.updated_at, now())
where w.approved_at is null
  and (
    w.status = 'published'
    or exists (
      select 1
      from public.ai_music_reservations r
      where r.work_id = w.id and r.status = 'spent'
    )
  );

grant execute on function public.approve_ai_music_work(uuid) to authenticated;
grant execute on function public.publish_ai_music_work(uuid) to authenticated;
