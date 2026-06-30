-- Persona oluşturma: auth trigger profil çakışması, özel profil RPC, seed iyileştirmesi

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
  p_tone text default 'samimi'
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

  v_persona_key := v_username;

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
    coalesce(nullif(trim(p_tone), ''), 'samimi')
  );

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'Profil oluşturulamadı (kullanıcı adı veya persona zaten var)');
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile_id', v_profile_id,
    'persona_key', v_persona_key,
    'username', v_username
  );
end;
$$;

create or replace function public.admin_seed_ai_personas(p_target_count int default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created int := 0;
  v_skipped int := 0;
  v_row record;
  v_profile_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  for v_row in
    select * from (values
      ('elif_korkmaz', 'elif_korkmaz', 'Elif Korkmaz', 'female'::public.gender_type, 'trabzon', 'Ortahisar', 'Trabzon''da yaşıyorum. Sahil yürüyüşü, çay ve yerel müzik.', 'elif_korkmaz'),
      ('zeynep_aktas', 'zeynep_aktas', 'Zeynep Aktaş', 'female', 'rize', 'Merkez', 'Rize''de öğretmenim. Ev yapımı tarifler ve yeşil doğa.', 'zeynep_aktas'),
      ('sude_yildiz', 'sude_yildiz', 'Sude Yıldız', 'female', 'ordu', 'Altınordu', 'Ordu sahilinde koşu yaparım. Günbatımı fotoğrafları paylaşırım.', 'sude_yildiz'),
      ('defne_arslan', 'defne_arslan', 'Defne Arslan', 'female', 'samsun', 'Atakum', 'Samsun''da üniversite öğrencisi. Kafe keşfi ve kitap önerileri.', 'defne_arslan'),
      ('ece_gunes', 'ece_gunes', 'Ece Güneş', 'female', 'giresun', 'Merkez', 'Giresun fındığı ve fındık hasadı hikâyeleri.', 'ece_gunes'),
      ('aylin_demir', 'aylin_demir', 'Aylin Demir', 'female', 'artvin', 'Merkez', 'Artvin yaylalarını çok severim. Hafta sonu kaçamak rotaları.', 'aylin_demir'),
      ('melis_celik', 'melis_celik', 'Melis Çelik', 'female', 'trabzon', 'Akçaabat', 'Akçaabat köftesi tartışmasına hazırım. Aile ziyaretleri ve sohbet.', 'melis_celik'),
      ('naz_ozkan', 'naz_ozkan', 'Naz Özkan', 'female', 'rize', 'Çayeli', 'Çay bahçelerinde vakit geçirmeyi severim. Sakin bir tempoda yaşarım.', 'naz_ozkan'),
      ('emre_kaya', 'emre_kaya', 'Emre Kaya', 'male', 'trabzon', 'Ortahisar', 'Trabzon''da mühendisim. Maç yorumları ve boğaz manzarası.', 'emre_kaya'),
      ('burak_sahin', 'burak_sahin', 'Burak Şahin', 'male', 'rize', 'Merkez', 'Rize''de balık tutmayı severim. Sabah erken sahil notları.', 'burak_sahin'),
      ('can_ozturk', 'can_ozturk', 'Can Öztürk', 'male', 'ordu', 'Ünye', 'Ünye sahili ve motor gezintileri. Yerel esnafı desteklerim.', 'can_ozturk'),
      ('kerem_yilmaz', 'kerem_yilmaz', 'Kerem Yılmaz', 'male', 'samsun', 'İlkadım', 'Samsun''da çalışıyorum. Trafik alternatifleri ve pratik ipuçları.', 'kerem_yilmaz'),
      ('mert_polat', 'mert_polat', 'Mert Polat', 'male', 'giresun', 'Bulancak', 'Bulancak sahilinde yaşıyorum. Spor ve deniz havası.', 'mert_polat'),
      ('onur_kilic', 'onur_kilic', 'Onur Kılıç', 'male', 'artvin', 'Hopa', 'Hopa sınırında yaşıyorum. Doğa fotoğrafları ve kısa geziler.', 'onur_kilic'),
      ('baris_erdem', 'baris_erdem', 'Barış Erdem', 'male', 'trabzon', 'Yomra', 'Yomra''da küçük bir işletme işletiyorum. Yerel ekonomi ve üretim.', 'baris_erdem'),
      ('deniz_aksoy', 'deniz_aksoy', 'Deniz Aksoy', 'male', 'rize', 'Ardeşen', 'Ardeşen''de yaşıyorum. Yağmur sonrası manzara avcısı.', 'deniz_aksoy')
    ) as t(persona_key, username, full_name, gender, region_id, district, bio, avatar_seed)
  loop
    exit when v_created >= greatest(1, least(coalesce(p_target_count, 12), 16));

    v_profile_id := public._vora_create_persona_account(
      v_row.username, v_row.full_name, v_row.gender, v_row.region_id,
      v_row.district, v_row.bio, v_row.persona_key, v_row.avatar_seed
    );

    if v_profile_id is not null then
      v_created := v_created + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'created', v_created,
    'skipped', v_skipped,
    'target', p_target_count,
    'total', (select count(*)::int from public.ai_personas)
  );
end;
$$;

grant execute on function public.admin_create_ai_persona(text, text, public.gender_type, text, text, text, text) to authenticated, service_role;
