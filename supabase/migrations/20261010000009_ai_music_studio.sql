-- AI müzik stüdyosu: arka plan üretimi, söz/ses, referans dosya, süre ve platformdan kaldırma

alter table public.ai_music_works
  drop constraint if exists ai_music_works_prompt_len;

alter table public.ai_music_works
  add constraint ai_music_works_prompt_len check (char_length(prompt) between 0 and 800);

alter table public.ai_music_works
  drop constraint if exists ai_music_works_status_check;

alter table public.ai_music_works
  add constraint ai_music_works_status_check
  check (status in ('generating', 'ready', 'published', 'failed', 'removed'));

alter table public.ai_music_works
  alter column audio_storage_path drop not null,
  alter column audio_url drop not null;

alter table public.ai_music_works
  add column if not exists vocal text not null default 'instrumental',
  add column if not exists lyrics text,
  add column if not exists stage text not null default 'ready',
  add column if not exists progress integer not null default 100,
  add column if not exists reference_storage_path text,
  add column if not exists reference_name text,
  add column if not exists reference_kind text,
  add column if not exists error_message text;

alter table public.ai_music_works
  drop constraint if exists ai_music_works_vocal_check;

alter table public.ai_music_works
  add constraint ai_music_works_vocal_check
  check (vocal in ('instrumental', 'female', 'male'));

alter table public.ai_music_works
  drop constraint if exists ai_music_works_progress_check;

alter table public.ai_music_works
  add constraint ai_music_works_progress_check
  check (progress between 0 and 100);

alter table public.ai_music_works
  drop constraint if exists ai_music_works_reference_kind_check;

alter table public.ai_music_works
  add constraint ai_music_works_reference_kind_check
  check (reference_kind is null or reference_kind in ('audio', 'video'));

create or replace function public.update_ai_music_work(p_work_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
  v_title text := left(trim(coalesce(p_title, '')), 120);
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;
  if char_length(v_title) < 1 then
    raise exception 'Parça adı gerekli';
  end if;

  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu parçayı yalnızca sahibi düzenleyebilir';
  end if;
  if v_work.status = 'generating' then
    raise exception 'Parça hazırlanırken düzenlenemez';
  end if;

  update public.ai_music_works
  set title = v_title, updated_at = now()
  where id = p_work_id;

  if v_work.sound_id is not null then
    update public.sounds set title = v_title, updated_at = now() where id = v_work.sound_id;
  end if;

  if v_work.music_track_id is not null then
    update public.music_tracks
    set title = v_title, display_title = v_title, updated_at = now()
    where id = v_work.music_track_id;
  end if;
end;
$$;

create or replace function public.withdraw_ai_music_work(p_work_id uuid)
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

  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_work.author_id <> auth.uid() then
    raise exception 'Bu parçayı yalnızca sahibi kaldırabilir';
  end if;
  if v_work.status <> 'published' then
    return;
  end if;

  if v_work.sound_id is not null then
    update public.sounds
    set status = 'hidden', privacy = 'private', updated_at = now()
    where id = v_work.sound_id;
  end if;

  update public.ai_music_works
  set status = 'ready', updated_at = now()
  where id = p_work_id;
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
    'reference_path', v_work.reference_storage_path
  );
end;
$$;

grant execute on function public.update_ai_music_work(uuid, text) to authenticated;
grant execute on function public.withdraw_ai_music_work(uuid) to authenticated;
grant execute on function public.delete_ai_music_work(uuid) to authenticated;
