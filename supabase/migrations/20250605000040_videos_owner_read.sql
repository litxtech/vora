-- Reel yükleme: INSERT ... RETURNING için sahip kendi videolarını okuyabilmeli.
-- videos_public_read yalnızca status = 'ready' satırlarına izin veriyordu;
-- processing/uploading kayıtları 403 (42501) ile dönüyordu.

drop policy if exists "videos_owner_read" on public.videos;

create policy "videos_owner_read" on public.videos
  for select using (auth.uid() = owner_id);

grant select, insert, update on public.videos to authenticated;
