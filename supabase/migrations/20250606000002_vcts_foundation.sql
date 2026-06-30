-- VORA Content Trust System (VCTS) — Foundation
-- Publisher keys, content trust records, audit ledger, verification RPC

-- ─── Publisher key generation ────────────────────────────────────────────────

create or replace function public.generate_publisher_key()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  seg1 text := '';
  seg2 text := '';
  seg3 text := '';
  i int;
  key text;
begin
  for i in 1..4 loop
    seg1 := seg1 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    seg2 := seg2 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    seg3 := seg3 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  key := 'VORA-USER-' || seg1 || '-' || seg2 || '-' || seg3;
  return key;
end;
$$;

alter table public.profiles
  add column if not exists publisher_key text;

create unique index if not exists profiles_publisher_key_unique
  on public.profiles (publisher_key)
  where publisher_key is not null;

-- Backfill existing profiles
update public.profiles
set publisher_key = public.generate_publisher_key()
where publisher_key is null;

alter table public.profiles
  alter column publisher_key set default public.generate_publisher_key();

-- Ensure NOT NULL after backfill
alter table public.profiles
  alter column publisher_key set not null;

-- ─── Trust code sequence ─────────────────────────────────────────────────────

create sequence if not exists public.vcts_trust_code_seq start 1;

create or replace function public.generate_trust_code()
returns text
language plpgsql
as $$
declare
  year_part text := to_char(now(), 'YYYY');
  seq_num bigint;
begin
  seq_num := nextval('public.vcts_trust_code_seq');
  return 'VR-' || year_part || '-' || lpad(seq_num::text, 6, '0');
end;
$$;

-- ─── Enums ───────────────────────────────────────────────────────────────────

do $$ begin
  create type public.vcts_content_type as enum ('text', 'image', 'video', 'mixed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.vcts_trust_status as enum ('verified', 'disputed', 'tampered', 'pending');
exception when duplicate_object then null;
end $$;

-- ─── Content trust records ───────────────────────────────────────────────────

create table if not exists public.content_trust_records (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  trust_code text not null unique default public.generate_trust_code(),
  publisher_key text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content_hash text not null,
  content_type public.vcts_content_type not null default 'text',
  device_platform text,
  ip_hash text,
  location_hash text,
  status public.vcts_trust_status not null default 'verified',
  created_at timestamptz not null default now()
);

create unique index if not exists content_trust_records_post_id_unique
  on public.content_trust_records (post_id);

create index if not exists content_trust_records_trust_code_idx
  on public.content_trust_records (trust_code);

create index if not exists content_trust_records_publisher_key_idx
  on public.content_trust_records (publisher_key);

create index if not exists content_trust_records_content_hash_idx
  on public.content_trust_records (content_hash);

-- ─── Per-asset hashes ────────────────────────────────────────────────────────

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  trust_record_id uuid not null references public.content_trust_records(id) on delete cascade,
  storage_path text,
  media_url text,
  sha256 text not null,
  asset_index int not null default 0,
  watermark_version int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists content_assets_trust_record_id_idx
  on public.content_assets (trust_record_id);

create index if not exists content_assets_sha256_idx
  on public.content_assets (sha256);

-- ─── Immutable audit ledger (WORM) ───────────────────────────────────────────

create table if not exists public.vcts_audit_ledger (
  id uuid primary key default gen_random_uuid(),
  trust_code text not null,
  post_id uuid not null,
  publisher_key text not null,
  author_id uuid not null,
  content_hash text not null,
  action text not null check (action in ('created', 'verified', 'disputed', 'hash_mismatch')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists vcts_audit_ledger_trust_code_idx
  on public.vcts_audit_ledger (trust_code);

create index if not exists vcts_audit_ledger_post_id_idx
  on public.vcts_audit_ledger (post_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.content_trust_records enable row level security;
alter table public.content_assets enable row level security;
alter table public.vcts_audit_ledger enable row level security;

-- Public read for verification
create policy content_trust_records_public_read
  on public.content_trust_records for select
  using (true);

create policy content_assets_public_read
  on public.content_assets for select
  using (true);

-- Authors can insert their own trust records (via RPC preferred)
create policy content_trust_records_author_insert
  on public.content_trust_records for insert
  with check (author_id = auth.uid());

create policy content_assets_author_insert
  on public.content_assets for insert
  with check (
    exists (
      select 1 from public.content_trust_records ctr
      where ctr.id = trust_record_id and ctr.author_id = auth.uid()
    )
  );

-- Audit ledger: insert only, no update/delete
create policy vcts_audit_ledger_insert
  on public.vcts_audit_ledger for insert
  with check (true);

create policy vcts_audit_ledger_admin_read
  on public.vcts_audit_ledger for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
    )
  );

-- ─── Attestation RPC ─────────────────────────────────────────────────────────

create or replace function public.create_content_trust_record(
  p_post_id uuid,
  p_content_hash text,
  p_content_type public.vcts_content_type,
  p_device_platform text default null,
  p_ip_hash text default null,
  p_location_hash text default null,
  p_assets jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_publisher_key text;
  v_trust_code text;
  v_record_id uuid;
  v_asset jsonb;
  v_idx int := 0;
begin
  v_author_id := auth.uid();
  if v_author_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.posts
    where id = p_post_id and author_id = v_author_id
  ) then
    raise exception 'post not found or not owned by caller';
  end if;

  if exists (select 1 from public.content_trust_records where post_id = p_post_id) then
    select trust_code, id into v_trust_code, v_record_id
    from public.content_trust_records where post_id = p_post_id;
    return jsonb_build_object('trust_code', v_trust_code, 'record_id', v_record_id, 'existing', true);
  end if;

  select publisher_key into v_publisher_key
  from public.profiles where id = v_author_id;

  if v_publisher_key is null then
    v_publisher_key := public.generate_publisher_key();
    update public.profiles set publisher_key = v_publisher_key where id = v_author_id;
  end if;

  v_trust_code := public.generate_trust_code();

  insert into public.content_trust_records (
    post_id, trust_code, publisher_key, author_id,
    content_hash, content_type, device_platform, ip_hash, location_hash
  )
  values (
    p_post_id, v_trust_code, v_publisher_key, v_author_id,
    p_content_hash, p_content_type, p_device_platform, p_ip_hash, p_location_hash
  )
  returning id into v_record_id;

  for v_asset in select * from jsonb_array_elements(p_assets)
  loop
    insert into public.content_assets (
      trust_record_id, storage_path, media_url, sha256, asset_index, watermark_version
    )
    values (
      v_record_id,
      v_asset->>'storage_path',
      v_asset->>'media_url',
      v_asset->>'sha256',
      coalesce((v_asset->>'asset_index')::int, v_idx),
      coalesce((v_asset->>'watermark_version')::int, 1)
    );
    v_idx := v_idx + 1;
  end loop;

  insert into public.vcts_audit_ledger (
    trust_code, post_id, publisher_key, author_id, content_hash, action, metadata
  )
  values (
    v_trust_code, p_post_id, v_publisher_key, v_author_id, p_content_hash, 'created',
    jsonb_build_object(
      'content_type', p_content_type,
      'device_platform', p_device_platform,
      'asset_count', jsonb_array_length(p_assets)
    )
  );

  return jsonb_build_object(
    'trust_code', v_trust_code,
    'record_id', v_record_id,
    'publisher_key', v_publisher_key,
    'existing', false
  );
end;
$$;

grant execute on function public.create_content_trust_record(uuid, text, public.vcts_content_type, text, text, text, jsonb)
  to authenticated;

-- ─── Verification RPC (public) ───────────────────────────────────────────────

create or replace function public.verify_content_trust(p_trust_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.content_trust_records%rowtype;
  v_username text;
  v_post_content text;
  v_post_created timestamptz;
begin
  select * into v_record
  from public.content_trust_records
  where trust_code = p_trust_code;

  if not found then
    return jsonb_build_object(
      'found', false,
      'status', 'not_found',
      'message', 'İçerik kaydı bulunamadı'
    );
  end if;

  select p.username into v_username
  from public.profiles p where p.id = v_record.author_id;

  select content, created_at into v_post_content, v_post_created
  from public.posts where id = v_record.post_id;

  return jsonb_build_object(
    'found', true,
    'status', v_record.status,
    'trust_code', v_record.trust_code,
    'publisher_key', v_record.publisher_key,
    'content_hash', v_record.content_hash,
    'content_type', v_record.content_type,
    'hash_match', v_record.status = 'verified',
    'author_username', v_username,
    'author_id', v_record.author_id,
    'post_id', v_record.post_id,
    'created_at', v_record.created_at,
    'post_created_at', v_post_created,
    'verified', v_record.status = 'verified'
  );
end;
$$;

grant execute on function public.verify_content_trust(text) to anon, authenticated;

-- ─── Update handle_new_user for publisher_key ────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  meta_birth_date date;
  meta_policy_consents jsonb;
  meta_is_guest boolean;
  meta_first_name text;
  meta_last_name text;
  meta_full_name text;
  meta_gender public.gender_type;
  meta_account_type public.account_type;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  final_username := lower(base_username);

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(base_username) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  if new.raw_user_meta_data->>'birth_date' is not null then
    meta_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
  end if;

  meta_policy_consents := coalesce(new.raw_user_meta_data->'policy_consents', '{}'::jsonb);
  meta_is_guest := coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false);
  meta_first_name := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  meta_last_name := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  meta_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    trim(concat_ws(' ', meta_first_name, meta_last_name))
  );

  if new.raw_user_meta_data->>'gender' is not null then
    meta_gender := (new.raw_user_meta_data->>'gender')::public.gender_type;
  end if;

  if new.raw_user_meta_data->>'account_type' is not null then
    meta_account_type := (new.raw_user_meta_data->>'account_type')::public.account_type;
  else
    meta_account_type := 'personal';
  end if;

  insert into public.profiles (
    id, username, full_name, first_name, last_name, birth_date,
    policy_consents, is_guest, gender, account_type, publisher_key
  )
  values (
    new.id,
    final_username,
    meta_full_name,
    meta_first_name,
    meta_last_name,
    meta_birth_date,
    meta_policy_consents,
    meta_is_guest,
    meta_gender,
    meta_account_type,
    public.generate_publisher_key()
  );

  return new;
end;
$$;

-- Update ensure_current_user_profile
create or replace function public.ensure_current_user_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_id uuid;
  base_username text;
  final_username text;
begin
  v_id := auth.uid();
  if v_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_id) then
    return v_id;
  end if;

  select * into v_user from auth.users where id = v_id;

  base_username := coalesce(
    nullif(trim(v_user.raw_user_meta_data->>'username'), ''),
    split_part(v_user.email, '@', 1),
    'user'
  );
  final_username := lower(base_username);

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(base_username) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (
    id, username, full_name, is_guest, account_type, onboarding_completed, publisher_key
  )
  values (
    v_id,
    final_username,
    nullif(trim(v_user.raw_user_meta_data->>'full_name'), ''),
    coalesce((v_user.raw_user_meta_data->>'is_guest')::boolean, false),
    coalesce((v_user.raw_user_meta_data->>'account_type')::public.account_type, 'personal'),
    false,
    public.generate_publisher_key()
  );

  return v_id;
end;
$$;
