-- Vora Müzik dakikası üretimde ve düzenlemede düşmez.
-- Hak, sahip parçayı onaylayıp kütüphaneye gönderince bir kez düşer.

create or replace function public.assert_ai_music_allowance(
  p_user_id uuid,
  p_seconds integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bal public.ai_music_balances%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Yetkisiz';
  end if;
  if p_seconds is null or p_seconds < 10 or p_seconds > 180 then
    raise exception 'Geçersiz süre';
  end if;

  perform public.ensure_ai_music_balance(p_user_id);

  select * into bal
  from public.ai_music_balances
  where user_id = p_user_id;

  if bal.user_id is null
     or bal.granted_sec - bal.reserved_sec - bal.spent_sec < p_seconds then
    raise exception 'Yetersiz müzik süresi';
  end if;
end;
$$;

create or replace function public.charge_ai_music_on_approve(p_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
  v_seconds integer;
  res public.ai_music_reservations%rowtype;
  bal public.ai_music_balances%rowtype;
  v_available integer;
begin
  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;

  v_seconds := least(180, greatest(10, ceil(v_work.duration_sec)::integer));

  perform public.ensure_ai_music_balance(v_work.author_id);

  select * into res
  from public.ai_music_reservations
  where work_id = p_work_id
  for update;

  if res.status = 'spent' then
    return;
  end if;

  select * into bal
  from public.ai_music_balances
  where user_id = v_work.author_id
  for update;

  v_available := bal.granted_sec - bal.reserved_sec - bal.spent_sec;
  if res.status = 'reserved' then
    v_available := v_available + res.seconds;
  end if;

  if v_available < v_seconds then
    raise exception 'Yetersiz müzik süresi';
  end if;

  if res.status = 'reserved' then
    update public.ai_music_balances
    set reserved_sec = greatest(0, reserved_sec - res.seconds),
        spent_sec = spent_sec + v_seconds,
        updated_at = now()
    where user_id = v_work.author_id;
  else
    update public.ai_music_balances
    set spent_sec = spent_sec + v_seconds,
        updated_at = now()
    where user_id = v_work.author_id;
  end if;

  if res.work_id is null then
    insert into public.ai_music_reservations (work_id, user_id, seconds, status)
    values (p_work_id, v_work.author_id, v_seconds, 'spent');
  else
    update public.ai_music_reservations
    set seconds = v_seconds,
        status = 'spent'
    where work_id = p_work_id;
  end if;
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

  perform public.charge_ai_music_on_approve(p_work_id);

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

-- Onaylanmamış parçalarda daha önce düşen veya ayrılan dakikayı geri yaz.
do $$
declare
  r record;
begin
  for r in
    select res.work_id, res.user_id, res.seconds, res.status
    from public.ai_music_reservations res
    join public.ai_music_works w on w.id = res.work_id
    where res.status in ('reserved', 'spent')
      and w.status is distinct from 'published'
    for update of res
  loop
    if r.status = 'reserved' then
      update public.ai_music_balances
      set reserved_sec = greatest(0, reserved_sec - r.seconds),
          updated_at = now()
      where user_id = r.user_id;
    else
      update public.ai_music_balances
      set spent_sec = greatest(0, spent_sec - r.seconds),
          updated_at = now()
      where user_id = r.user_id;
    end if;

    update public.ai_music_reservations
    set status = 'released'
    where work_id = r.work_id;
  end loop;
end;
$$;

revoke all on function public.assert_ai_music_allowance(uuid, integer) from public, anon, authenticated;
revoke all on function public.charge_ai_music_on_approve(uuid) from public, anon, authenticated;

grant execute on function public.assert_ai_music_allowance(uuid, integer) to service_role;
grant execute on function public.charge_ai_music_on_approve(uuid) to service_role;
grant execute on function public.publish_ai_music_work(uuid) to authenticated;
