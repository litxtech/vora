-- Müzik kütüphanesi senkron trigger'ını güvenilir upsert ile düzelt

create or replace function public.sync_sound_to_music_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist text;
  v_track_id uuid;
begin
  select coalesce(p.username, 'kullanici')
  into v_artist
  from public.profiles p
  where p.id = new.author_id;

  if new.status = 'published'
     and new.privacy = 'public'
     and coalesce(new.audio_url, '') <> '' then

    select id into v_track_id
    from public.music_tracks
    where source_sound_id = new.id
    limit 1;

    if v_track_id is not null then
      update public.music_tracks
      set
        title = new.title,
        display_title = new.title,
        artist = '@' || v_artist,
        cover_url = new.cover_url,
        cover_storage_path = new.cover_storage_path,
        audio_url = new.audio_url,
        audio_storage_path = new.audio_storage_path,
        duration_seconds = new.duration_sec,
        publication_status = 'active',
        updated_at = now()
      where id = v_track_id;
    else
      insert into public.music_tracks (
        title,
        display_title,
        artist,
        cover_url,
        cover_storage_path,
        audio_url,
        audio_storage_path,
        duration_seconds,
        license_status,
        publication_status,
        created_by,
        source_sound_id
      ) values (
        new.title,
        new.title,
        '@' || v_artist,
        new.cover_url,
        new.cover_storage_path,
        new.audio_url,
        new.audio_storage_path,
        new.duration_sec,
        'licensed',
        'active',
        new.author_id,
        new.id
      );
    end if;
  else
    update public.music_tracks
    set publication_status = 'hidden', updated_at = now()
    where source_sound_id = new.id;
  end if;

  return new;
exception
  when others then
    -- Ses kaydı başarısız olmasın; müzik senkronu arka planda atlanır
    raise warning 'sync_sound_to_music_library failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;
