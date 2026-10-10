-- Vora AI Müzik — ElevenLabs üretimi, telif kaydı, kütüphane ve hesap başına kullanım

create table if not exists public.ai_music_works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  prompt text not null,
  style text not null,
  duration_sec numeric(8, 2) not null,
  instrumental boolean not null default true,
  status text not null default 'ready'
    check (status in ('ready', 'published', 'failed', 'removed')),
  audio_storage_path text not null,
  audio_url text not null,
  sound_id uuid references public.sounds(id) on delete set null,
  music_track_id uuid references public.music_tracks(id) on delete set null,
  copyright_code text not null unique,
  rights_holder text not null default 'Vora Karadeniz',
  rights_notice text not null,
  model_id text not null default 'music_v2',
  account_usage_count integer not null default 0,
  share_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_music_works_style check (
    style in ('kaval', 'kemence', 'horon', 'tulum', 'karma', 'serbest')
  ),
  constraint ai_music_works_title_len check (char_length(trim(title)) between 1 and 120),
  constraint ai_music_works_prompt_len check (char_length(trim(prompt)) between 8 and 800)
);

create index if not exists ai_music_works_author_idx
  on public.ai_music_works (author_id, created_at desc);
create index if not exists ai_music_works_sound_idx
  on public.ai_music_works (sound_id) where sound_id is not null;
create index if not exists ai_music_works_track_idx
  on public.ai_music_works (music_track_id) where music_track_id is not null;

alter table public.music_track_usages
  add column if not exists story_item_id uuid references public.story_items(id) on delete set null;

create index if not exists music_track_usages_story_idx
  on public.music_track_usages (story_item_id) where story_item_id is not null;

create trigger ai_music_works_updated_at
  before update on public.ai_music_works
  for each row execute function public.set_updated_at();

-- Hesap başına 1 kullanım; her gönderi / reel / hikaye ayrı paylaşım
create or replace function public.refresh_ai_music_usage(p_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sound uuid;
  v_track uuid;
  v_accounts integer := 0;
  v_shares integer := 0;
begin
  select sound_id, music_track_id into v_sound, v_track
  from public.ai_music_works
  where id = p_work_id;

  if not found then
    return;
  end if;

  select count(*)::int into v_accounts
  from (
    select user_id from public.sound_usage
    where sound_id = v_sound and is_valid
    union
    select user_id from public.music_track_usages
    where track_id = v_track
  ) accounts;

  select count(*)::int into v_shares
  from (
    select 'post:' || post_id::text as ref
    from public.sound_usage
    where sound_id = v_sound and post_id is not null and is_valid
    union
    select 'reel:' || reel_id::text
    from public.sound_usage
    where sound_id = v_sound and reel_id is not null and is_valid
    union
    select 'story:' || story_item_id::text
    from public.sound_usage
    where sound_id = v_sound and story_item_id is not null and is_valid
    union
    select 'post:' || post_id::text
    from public.music_track_usages
    where track_id = v_track and post_id is not null
    union
    select 'reel:' || reel_id::text
    from public.music_track_usages
    where track_id = v_track and reel_id is not null
    union
    select 'story:' || story_item_id::text
    from public.music_track_usages
    where track_id = v_track and story_item_id is not null
  ) shares;

  update public.ai_music_works
  set
    account_usage_count = v_accounts,
    share_count = v_shares,
    updated_at = now()
  where id = p_work_id;

  if v_sound is not null then
    update public.sounds
    set
      usage_count = v_accounts,
      share_count = v_shares,
      last_used_at = case when v_shares > 0 or v_accounts > 0 then now() else last_used_at end
    where id = v_sound;
  end if;

  if v_track is not null then
    update public.music_tracks
    set
      usage_count = v_accounts,
      last_used_at = case when v_accounts > 0 then now() else last_used_at end
    where id = v_track;
  end if;
end;
$$;

create or replace function public.music_track_usage_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work uuid;
begin
  select id into v_work
  from public.ai_music_works
  where music_track_id = new.track_id;

  if v_work is not null then
    perform public.refresh_ai_music_usage(v_work);
  else
    update public.music_tracks
    set
      usage_count = usage_count + 1,
      last_used_at = new.created_at
    where id = new.track_id;
  end if;

  insert into public.user_recent_music (user_id, track_id, used_at)
  values (new.user_id, new.track_id, new.created_at)
  on conflict (user_id, track_id) do update set used_at = excluded.used_at;

  return new;
end;
$$;

create or replace function public.record_sound_usage(
  p_sound_id uuid,
  p_post_id uuid default null,
  p_reel_id uuid default null,
  p_story_item_id uuid default null,
  p_music_start_sec numeric default 0,
  p_music_end_sec numeric default 0,
  p_music_volume numeric default 0.8,
  p_original_audio_volume numeric default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_sound public.sounds%rowtype;
  v_valid boolean := true;
  v_recent_count integer;
  v_work uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_sound from public.sounds where id = p_sound_id;
  if not found then
    raise exception 'Ses bulunamadı';
  end if;

  if v_sound.status <> 'published' then
    raise exception 'Bu ses kullanılamaz';
  end if;

  if v_sound.privacy = 'private' and v_sound.author_id <> auth.uid() then
    raise exception 'Bu ses gizli';
  end if;

  select count(*)::integer into v_recent_count
  from public.sound_usage
  where sound_id = p_sound_id
    and user_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    v_valid := false;
  end if;

  insert into public.sound_usage (
    sound_id, user_id, post_id, reel_id, story_item_id,
    music_start_sec, music_end_sec, music_volume, original_audio_volume, is_valid
  )
  values (
    p_sound_id, auth.uid(), p_post_id, p_reel_id, p_story_item_id,
    p_music_start_sec, p_music_end_sec, p_music_volume, p_original_audio_volume, v_valid
  )
  returning id into v_id;

  select id into v_work from public.ai_music_works where sound_id = p_sound_id;

  if v_valid and v_work is null then
    update public.sounds
    set
      usage_count = usage_count + 1,
      points = points + 1,
      trend_score = trend_score + 1.5,
      last_used_at = now(),
      updated_at = now()
    where id = p_sound_id;

    perform public.bump_sound_daily_stats(p_sound_id, 1, 0, 0, 0, 0);
    perform public.sync_sound_milestones(p_sound_id);

    perform public.notify_sound_owner(
      p_sound_id,
      'sound_used',
      'Sesin kullanıldı',
      'Birisi sesini içeriğinde kullandı.',
      auth.uid(),
      jsonb_build_object('usage_id', v_id)
    );
  elsif v_valid and v_work is not null then
    update public.sounds
    set
      points = points + 1,
      trend_score = trend_score + 1.5,
      updated_at = now()
    where id = p_sound_id;

    perform public.refresh_ai_music_usage(v_work);
    perform public.sync_sound_milestones(p_sound_id);
    perform public.notify_sound_owner(
      p_sound_id,
      'sound_used',
      'Müziğin kullanıldı',
      'Bir hesap müziğini içeriğinde paylaştı.',
      auth.uid(),
      jsonb_build_object('usage_id', v_id)
    );
  end if;

  return v_id;
end;
$$;

drop function if exists public.record_music_usage(uuid, uuid, uuid, numeric, numeric, numeric, numeric);

create or replace function public.record_music_usage(
  p_track_id uuid,
  p_post_id uuid default null,
  p_reel_id uuid default null,
  p_music_start_sec numeric default 0,
  p_music_end_sec numeric default 0,
  p_music_volume numeric default 0.8,
  p_original_audio_volume numeric default 1,
  p_story_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_track public.music_tracks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select * into v_track from public.music_tracks where id = p_track_id;
  if not found then
    raise exception 'Müzik bulunamadı';
  end if;
  if v_track.publication_status <> 'active' or v_track.license_status <> 'licensed' then
    raise exception 'Bu müzik kullanılamaz';
  end if;

  insert into public.music_track_usages (
    track_id, user_id, post_id, reel_id, story_item_id,
    music_start_sec, music_end_sec, music_volume, original_audio_volume
  )
  values (
    p_track_id, auth.uid(), p_post_id, p_reel_id, p_story_item_id,
    p_music_start_sec, p_music_end_sec, p_music_volume, p_original_audio_volume
  )
  returning id into v_id;

  return v_id;
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
    author_id, title, description, audio_storage_path, audio_url,
    duration_sec, privacy, status, tags
  ) values (
    v_work.author_id,
    v_work.title,
    v_work.rights_notice,
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

create or replace function public.list_ai_music_shares(p_work_id uuid)
returns table (
  kind text,
  content_id uuid,
  author_id uuid,
  username text,
  full_name text,
  avatar_url text,
  caption text,
  thumb_url text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_work public.ai_music_works%rowtype;
begin
  select * into v_work from public.ai_music_works where id = p_work_id;
  if not found then
    return;
  end if;

  if v_work.status <> 'published' and v_work.author_id is distinct from auth.uid() and not public.is_moderator() then
    return;
  end if;

  return query
  select *
  from (
    select
      'post'::text,
      p.id,
      p.author_id,
      pr.username,
      pr.full_name,
      pr.avatar_url,
      left(coalesce(p.content, ''), 180),
      coalesce(p.media_urls[1], null),
      p.created_at
    from public.posts p
    left join public.profiles pr on pr.id = p.author_id
    where p.status = 'published'
      and (
        (v_work.sound_id is not null and p.sound_id = v_work.sound_id)
        or (v_work.music_track_id is not null and p.music_track_id = v_work.music_track_id)
      )

    union all

    select
      'reel'::text,
      r.id,
      r.author_id,
      pr.username,
      pr.full_name,
      pr.avatar_url,
      left(coalesce(r.caption, ''), 180),
      null::text,
      r.created_at
    from public.reels r
    left join public.profiles pr on pr.id = r.author_id
    where r.status = 'published'
      and (
        (v_work.sound_id is not null and r.sound_id = v_work.sound_id)
        or (v_work.music_track_id is not null and r.music_track_id = v_work.music_track_id)
      )

    union all

    select
      'story'::text,
      si.id,
      si.author_id,
      pr.username,
      pr.full_name,
      pr.avatar_url,
      'Hikaye'::text,
      coalesce(si.thumb_url, si.media_url),
      si.created_at
    from public.story_items si
    left join public.profiles pr on pr.id = si.author_id
    where si.status = 'published'
      and (
        si.id in (
          select su.story_item_id from public.sound_usage su
          where v_work.sound_id is not null
            and su.sound_id = v_work.sound_id
            and su.story_item_id is not null
            and su.is_valid
        )
        or si.id in (
          select mu.story_item_id from public.music_track_usages mu
          where v_work.music_track_id is not null
            and mu.track_id = v_work.music_track_id
            and mu.story_item_id is not null
        )
      )
  ) shares
  order by shares.created_at desc
  limit 80;
end;
$$;

grant execute on function public.refresh_ai_music_usage(uuid) to authenticated;
grant execute on function public.record_music_usage(uuid, uuid, uuid, numeric, numeric, numeric, numeric, uuid) to authenticated;
grant execute on function public.publish_ai_music_work(uuid) to authenticated;
grant execute on function public.list_ai_music_shares(uuid) to authenticated, anon;

alter table public.ai_music_works enable row level security;

create policy ai_music_works_select on public.ai_music_works
  for select using (
    author_id = auth.uid()
    or status = 'published'
    or public.is_moderator()
  );

create policy ai_music_works_delete on public.ai_music_works
  for delete using (
    author_id = auth.uid()
    and status in ('ready', 'failed')
  );
