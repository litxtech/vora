-- Vora persona: gerçekçi profiller, fotoğraflı paylaşım ayarları, seed düzeltmeleri

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
      'https://randomuser.me/api/portraits/women/' ||
      (abs(hashtext(coalesce(p_avatar_seed, 'persona'))) % 90)::text || '.jpg'
    else
      'https://randomuser.me/api/portraits/men/' ||
      (abs(hashtext(coalesce(p_avatar_seed, 'persona'))) % 90)::text || '.jpg'
  end;
$$;

update public.ai_settings
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'allow_photos', true,
  'photo_chance', 0.65,
  'allow_videos', false
)
where module = 'presence';

create or replace function public._vora_create_persona_account(
  p_username text,
  p_full_name text,
  p_gender public.gender_type,
  p_region_id text,
  p_district text,
  p_bio text,
  p_persona_key text,
  p_avatar_seed text,
  p_tone text default 'samimi'
)
returns uuid
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
  v_avatar text;
begin
  perform set_config('search_path', 'auth, public, extensions', true);

  if exists (select 1 from public.ai_personas where persona_key = p_persona_key) then
    return null;
  end if;

  if exists (select 1 from public.profiles where username = p_username) then
    return null;
  end if;

  v_avatar := public._vora_persona_avatar_url(p_gender, p_avatar_seed);

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
      'username', p_username,
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
    p_username,
    p_full_name,
    p_bio,
    p_region_id,
    p_district,
    p_gender,
    'user',
    false,
    false,
    true,
    v_avatar,
    now() - (random() * interval '2 hours')
  );

  insert into public.ai_personas (
    profile_id, persona_key, gender, display_name, region_id, district, bio, tone, avatar_seed
  )
  values (
    v_id, p_persona_key, p_gender, p_full_name, p_region_id, p_district, p_bio, p_tone, p_avatar_seed
  );

  return v_id;
exception
  when others then
    raise warning 'vora persona create failed (%): %', p_persona_key, sqlerrm;
    return null;
end;
$$;

update public.profiles pr
set
  is_ai_account = false,
  avatar_url = public._vora_persona_avatar_url(p.gender, p.avatar_seed),
  district = coalesce(pr.district, p.district),
  last_seen_at = coalesce(pr.last_seen_at, now() - (random() * interval '3 hours'))
from public.ai_personas p
where pr.id = p.profile_id;

grant execute on function public.admin_seed_ai_personas(int) to service_role;
grant execute on function public._vora_persona_avatar_url(public.gender_type, text) to authenticated, service_role;
