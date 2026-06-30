-- Persona yaşam döngüsü: avatar URL, günlük kota, gelişmiş oluşturma

update public.ai_settings
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'daily_persona_quota', 25,
  'auto_daily_personas', false,
  'allow_engagement', true,
  'engagement_likes_per_run', 4,
  'engagement_comments_per_run', 2,
  'default_persona_gender', 'mixed'
)
where module = 'presence';

create or replace function public._vora_persona_avatar_url(
  p_gender public.gender_type,
  p_avatar_seed text
)
returns text
language sql
immutable
as $$
  select case
    when p_gender = 'female'::public.gender_type then
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=480&h=480&fit=crop&crop=faces'
    else
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=480&h=480&fit=crop&crop=faces'
  end;
$$;

create or replace function public._vora_create_persona_account(
  p_username text,
  p_full_name text,
  p_gender public.gender_type,
  p_region_id text,
  p_district text,
  p_bio text,
  p_persona_key text,
  p_avatar_seed text,
  p_tone text default 'samimi',
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
  v_avatar text;
  v_username text := lower(trim(p_username));
begin
  perform set_config('search_path', 'auth, public, extensions', true);

  if exists (select 1 from public.ai_personas where persona_key = p_persona_key) then
    return null;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.username = v_username
      and not exists (
        select 1 from public.ai_personas ap
        where ap.profile_id = p.id and ap.persona_key = p_persona_key
      )
  ) then
    return null;
  end if;

  v_avatar := coalesce(nullif(trim(p_avatar_url), ''), public._vora_persona_avatar_url(p_gender, p_avatar_seed));

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_persona_key || '@persona.vora.local',
    extensions.crypt('vora-persona-no-login-' || v_id::text, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'username', v_username,
      'full_name', p_full_name,
      'gender', p_gender::text
    ),
    now(),
    now(),
    '', '', '', ''
  );

  insert into public.profiles (
    id, username, full_name, bio, region_id, district, gender,
    role, is_verified, is_ai_account, onboarding_completed, avatar_url, last_seen_at
  )
  values (
    v_id,
    v_username,
    p_full_name,
    p_bio,
    p_region_id,
    nullif(trim(p_district), ''),
    p_gender,
    'user',
    false,
    false,
    true,
    v_avatar,
    now() - (random() * interval '2 hours')
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    bio = excluded.bio,
    region_id = excluded.region_id,
    district = excluded.district,
    gender = excluded.gender,
    is_ai_account = false,
    onboarding_completed = true,
    avatar_url = excluded.avatar_url,
    last_seen_at = excluded.last_seen_at,
    updated_at = now();

  insert into public.ai_personas (
    profile_id, persona_key, gender, display_name, region_id, district, bio, tone, avatar_seed
  )
  values (
    v_id, p_persona_key, p_gender, p_full_name, p_region_id, nullif(trim(p_district), ''), p_bio, p_tone, p_avatar_seed
  );

  return v_id;
exception
  when others then
    raise warning 'vora persona create failed (%): %', p_persona_key, sqlerrm;
    return null;
end;
$$;

create or replace function public.admin_create_ai_persona(
  p_username text,
  p_full_name text,
  p_gender public.gender_type,
  p_region_id text,
  p_district text default null,
  p_bio text default '',
  p_tone text default 'samimi',
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(regexp_replace(trim(p_username), '[^a-zA-Z0-9_]', '', 'g'));
  v_persona_key text;
  v_profile_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if length(v_username) < 3 then
    raise exception 'Kullanıcı adı en az 3 karakter olmalı';
  end if;

  if not exists (select 1 from public.regions where id = p_region_id) then
    raise exception 'Geçersiz bölge';
  end if;

  while exists (select 1 from public.profiles where username = v_username) loop
    v_username := lower(regexp_replace(trim(p_username), '[^a-zA-Z0-9_]', '', 'g')) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  v_persona_key := v_username;

  v_profile_id := public._vora_create_persona_account(
    v_username,
    trim(p_full_name),
    p_gender,
    p_region_id,
    coalesce(p_district, ''),
    coalesce(nullif(trim(p_bio), ''), 'Karadeniz''de yaşıyorum.'),
    v_persona_key,
    v_persona_key,
    coalesce(nullif(trim(p_tone), ''), 'samimi'),
    p_avatar_url
  );

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'Profil oluşturulamadı');
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile_id', v_profile_id,
    'persona_key', v_persona_key,
    'username', v_username
  );
end;
$$;

create or replace function public.admin_personas_created_today()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.ai_personas
  where created_at >= date_trunc('day', now() at time zone 'Europe/Istanbul');
$$;

create or replace function public.admin_vora_presence_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'personas_total', (select count(*)::int from public.ai_personas),
    'personas_active', (select count(*)::int from public.ai_personas where enabled),
    'personas_today', (select public.admin_personas_created_today()),
    'posts_total', (select coalesce(sum(post_count), 0)::int from public.ai_personas),
    'last_run', (
      select jsonb_build_object(
        'started_at', r.started_at,
        'status', r.status,
        'posts_created', r.posts_created,
        'details', r.details
      )
      from public.ai_presence_runs r
      order by r.started_at desc
      limit 1
    )
  );
$$;

grant execute on function public.admin_create_ai_persona(text, text, public.gender_type, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_personas_created_today() to authenticated, service_role;
