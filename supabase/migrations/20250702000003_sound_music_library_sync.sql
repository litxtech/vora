-- Herkese açık kullanıcı seslerini müzik kütüphanesinde göster (anında kullanılabilir)

alter table public.music_tracks
  add column if not exists source_sound_id uuid references public.sounds (id) on delete cascade;

create unique index if not exists music_tracks_source_sound_id_idx
  on public.music_tracks (source_sound_id);

create or replace function public.sync_sound_to_music_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist text;
begin
  select coalesce(p.username, 'kullanici')
  into v_artist
  from public.profiles p
  where p.id = new.author_id;

  if new.status = 'published'
     and new.privacy = 'public'
     and coalesce(new.audio_url, '') <> '' then
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
    )
    on conflict (source_sound_id) do update set
      title = excluded.title,
      display_title = excluded.display_title,
      artist = excluded.artist,
      cover_url = excluded.cover_url,
      cover_storage_path = excluded.cover_storage_path,
      audio_url = excluded.audio_url,
      audio_storage_path = excluded.audio_storage_path,
      duration_seconds = excluded.duration_seconds,
      publication_status = 'active',
      updated_at = now();
  else
    update public.music_tracks
    set publication_status = 'hidden', updated_at = now()
    where source_sound_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sounds_music_library_sync on public.sounds;

create trigger sounds_music_library_sync
  after insert or update of title, description, cover_url, cover_storage_path, audio_url, audio_storage_path,
    duration_sec, privacy, status
  on public.sounds
  for each row
  execute function public.sync_sound_to_music_library();

-- Mevcut herkese açık sesleri senkronize et
update public.sounds s
set updated_at = now()
where s.status = 'published'
  and s.privacy = 'public'
  and not exists (
    select 1 from public.music_tracks mt where mt.source_sound_id = s.id
  );
