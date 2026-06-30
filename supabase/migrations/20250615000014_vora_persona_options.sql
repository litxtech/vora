-- Persona avatar: __none__ sentinel allows profiles without photo.
-- Presence config defaults for username style, avatar mode, batch max.

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

  v_avatar := case
    when nullif(trim(coalesce(p_avatar_url, '')), '') = '__none__' then null
    when nullif(trim(coalesce(p_avatar_url, '')), '') is not null then trim(p_avatar_url)
    else public._vora_persona_avatar_url(p_gender, p_avatar_seed)
  end;

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
  )
  on conflict (persona_key) do nothing;

  return v_id;
end;
$$;

update public.ai_settings
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'persona_username_style', coalesce(config->>'persona_username_style', 'underscore'),
  'persona_avatar_mode', coalesce(config->>'persona_avatar_mode', 'always'),
  'manual_persona_batch_max', coalesce((config->>'manual_persona_batch_max')::int, 100)
)
where module = 'presence';
