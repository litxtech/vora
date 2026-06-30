-- Vora AI otomatik varlık: gerçekçi persona profilleri ve zamanlanmış paylaşımlar

insert into public.ai_settings (module, label, enabled, config) values
  (
    'master',
    'Vora AI Ana Anahtar',
    true,
    '{"description":"Kapalıyken tüm Vora AI özellikleri devre dışı kalır."}'::jsonb
  ),
  (
    'presence',
    'Otomatik Paylaşım',
    false,
    '{
      "interval_minutes": 240,
      "max_posts_per_run": 2,
      "categories": {
        "general": true,
        "daily": true,
        "entertainment": true,
        "event": false,
        "business": false,
        "news": false,
        "traffic": false,
        "job": false,
        "lost_found": false,
        "emergency": false
      },
      "active_regions": ["trabzon", "rize", "ordu", "samsun", "giresun", "artvin"]
    }'::jsonb
  )
on conflict (module) do nothing;

create table if not exists public.ai_personas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  persona_key text not null unique,
  gender public.gender_type not null,
  display_name text not null,
  region_id text not null references public.regions (id),
  district text,
  bio text not null default '',
  tone text not null default 'samimi',
  interests jsonb not null default '[]'::jsonb,
  avatar_seed text not null,
  enabled boolean not null default true,
  last_post_at timestamptz,
  post_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_personas_region_idx on public.ai_personas (region_id, enabled);
create index if not exists ai_personas_last_post_idx on public.ai_personas (last_post_at nulls first);

create table if not exists public.ai_presence_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'skipped', 'failed')),
  personas_considered integer not null default 0,
  posts_created integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists ai_presence_runs_started_idx on public.ai_presence_runs (started_at desc);

alter table public.ai_personas enable row level security;
alter table public.ai_presence_runs enable row level security;

do $$ begin
  create policy ai_personas_admin_all on public.ai_personas
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_personas_public_read on public.ai_personas
    for select using (enabled = true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_presence_runs_admin_read on public.ai_presence_runs
    for select using (public.is_admin());
exception when duplicate_object then null;
end $$;

create or replace function public.admin_get_vora_presence_config()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'enabled', s.enabled,
        'config', s.config,
        'master_enabled', coalesce((select enabled from public.ai_settings where module = 'master'), true)
      )
      from public.ai_settings s
      where s.module = 'presence'
    ),
    '{"enabled":false,"config":{},"master_enabled":true}'::jsonb
  );
$$;

create or replace function public.admin_update_vora_presence_config(
  p_enabled boolean,
  p_config jsonb,
  p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  insert into public.ai_settings (module, label, enabled, config, updated_by, updated_at)
  values ('presence', 'Otomatik Paylaşım', p_enabled, coalesce(p_config, '{}'::jsonb), p_admin_id, now())
  on conflict (module) do update set
    enabled = excluded.enabled,
    config = coalesce(excluded.config, public.ai_settings.config),
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.admin_set_vora_master_enabled(
  p_enabled boolean,
  p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  insert into public.ai_settings (module, label, enabled, updated_by, updated_at)
  values ('master', 'Vora AI Ana Anahtar', p_enabled, p_admin_id, now())
  on conflict (module) do update set
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.admin_list_ai_personas(p_limit int default 60)
returns table (
  id uuid,
  profile_id uuid,
  persona_key text,
  gender public.gender_type,
  display_name text,
  username text,
  region_id text,
  district text,
  bio text,
  enabled boolean,
  post_count integer,
  last_post_at timestamptz,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.profile_id,
    p.persona_key,
    p.gender,
    p.display_name,
    pr.username,
    p.region_id,
    p.district,
    p.bio,
    p.enabled,
    p.post_count,
    p.last_post_at,
    pr.avatar_url
  from public.ai_personas p
  join public.profiles pr on pr.id = p.profile_id
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;

create or replace function public.admin_set_ai_persona_enabled(
  p_persona_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.ai_personas
  set enabled = p_enabled, updated_at = now()
  where id = p_persona_id;
end;
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
    'posts_total', (select coalesce(sum(post_count), 0)::int from public.ai_personas),
    'last_run', (
      select jsonb_build_object(
        'started_at', r.started_at,
        'status', r.status,
        'posts_created', r.posts_created
      )
      from public.ai_presence_runs r
      order by r.started_at desc
      limit 1
    )
  );
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
  if exists (select 1 from public.ai_personas where persona_key = p_persona_key) then
    return null;
  end if;

  v_avatar := 'https://api.dicebear.com/7.x/personas/svg?seed=' || p_avatar_seed || '&backgroundColor=c0aede,b6e3f4,d1d4f9';

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
      'gender', p_gender::text,
      'is_ai_account', true
    ),
    now(),
    now(),
    '', '', '', ''
  );

  insert into public.profiles (
    id, username, full_name, bio, region_id, gender,
    role, is_verified, is_ai_account, onboarding_completed, avatar_url
  )
  values (
    v_id,
    p_username,
    p_full_name,
    p_bio,
    p_region_id,
    p_gender,
    'user',
    false,
    true,
    true,
    v_avatar
  );

  insert into public.ai_personas (
    profile_id, persona_key, gender, display_name, region_id, district, bio, tone, avatar_seed
  )
  values (
    v_id, p_persona_key, p_gender, p_full_name, p_region_id, p_district, p_bio, p_tone, p_avatar_seed
  );

  return v_id;
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
  v_row record;
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
    if public._vora_create_persona_account(
      v_row.username, v_row.full_name, v_row.gender, v_row.region_id,
      v_row.district, v_row.bio, v_row.persona_key, v_row.avatar_seed
    ) is not null then
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'target', p_target_count);
end;
$$;

create or replace function public.admin_vora_ai_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'summaries', (select count(*)::int from public.ai_summaries),
    'memories', (select count(*)::int from public.ai_memories),
    'recommendations', (select count(*)::int from public.ai_recommendations),
    'map_data', (select count(*)::int from public.ai_map_data where expires_at > now()),
    'comment_threads', (select count(*)::int from public.ai_comment_threads),
    'personas', (select count(*)::int from public.ai_personas),
    'presence_runs', (select count(*)::int from public.ai_presence_runs)
  );
$$;

create or replace function public.dispatch_vora_presence_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_master boolean;
  v_presence boolean;
begin
  select coalesce(enabled, true) into v_master from public.ai_settings where module = 'master';
  select coalesce(enabled, false) into v_presence from public.ai_settings where module = 'presence';

  if not v_master or not v_presence then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'supabase_url' limit 1;

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/vora-presence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('action', 'run', 'source', 'cron')
  );
end;
$$;

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  begin
    perform cron.unschedule('vora-presence-tick');
  exception when others then
    null;
  end;
  perform cron.schedule(
    'vora-presence-tick',
    '*/30 * * * *',
    $$select public.dispatch_vora_presence_tick();$$
  );
exception when others then
  raise notice 'pg_cron kullanılamıyor; vora-presence manuel çalıştırılmalı: %', sqlerrm;
end;
$cron$;

grant execute on function public.admin_get_vora_presence_config() to authenticated;
grant execute on function public.admin_update_vora_presence_config(boolean, jsonb, uuid) to authenticated;
grant execute on function public.admin_set_vora_master_enabled(boolean, uuid) to authenticated;
grant execute on function public.admin_list_ai_personas(int) to authenticated;
grant execute on function public.admin_set_ai_persona_enabled(uuid, boolean) to authenticated;
grant execute on function public.admin_vora_presence_stats() to authenticated;
grant execute on function public.admin_seed_ai_personas(int) to authenticated;
