-- Caps: kullanıcı kütüphanesi, market, tekil kullanıcı kullanım sayımı

do $$ begin
  create type public.cap_status as enum ('published', 'hidden', 'removed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.cap_library_source as enum ('created', 'market');
exception when duplicate_object then null;
end $$;

alter type public.message_type add value if not exists 'cap';

create table if not exists public.caps (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  image_url text not null,
  storage_path text not null,
  thumb_url text,
  video_url text,
  duration_ms integer,
  width integer,
  height integer,
  status public.cap_status not null default 'published',
  unique_user_count integer not null default 0,
  library_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caps_title_len check (title is null or char_length(trim(title)) between 1 and 80),
  constraint caps_duration_max check (duration_ms is null or (duration_ms > 0 and duration_ms <= 3500)),
  constraint caps_unique_user_count_nonneg check (unique_user_count >= 0),
  constraint caps_library_count_nonneg check (library_count >= 0)
);

create index if not exists caps_creator_idx on public.caps (creator_id, created_at desc);
create index if not exists caps_market_idx
  on public.caps (unique_user_count desc, created_at desc)
  where status = 'published';
create index if not exists caps_new_idx
  on public.caps (created_at desc)
  where status = 'published';

create table if not exists public.user_cap_library (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cap_id uuid not null references public.caps(id) on delete cascade,
  source public.cap_library_source not null default 'market',
  created_at timestamptz not null default now(),
  primary key (user_id, cap_id)
);

create index if not exists user_cap_library_user_idx
  on public.user_cap_library (user_id, created_at desc);
create index if not exists user_cap_library_cap_idx
  on public.user_cap_library (cap_id);

-- Her kullanıcı bir caps için yalnızca bir kez sayılır
create table if not exists public.cap_usage (
  cap_id uuid not null references public.caps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_used_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (cap_id, user_id)
);

create index if not exists cap_usage_cap_idx on public.cap_usage (cap_id, first_used_at desc);
create index if not exists cap_usage_user_idx on public.cap_usage (user_id, last_used_at desc);

alter table public.post_comments
  add column if not exists cap_id uuid references public.caps(id) on delete set null;

create index if not exists post_comments_cap_idx
  on public.post_comments (cap_id)
  where cap_id is not null;

create or replace function public.set_caps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists caps_updated_at on public.caps;
create trigger caps_updated_at
  before update on public.caps
  for each row execute function public.set_caps_updated_at();

-- Kütüphaneye ekleme / çıkarma sayacı
create or replace function public.bump_cap_library_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.caps
    set library_count = library_count + 1, updated_at = now()
    where id = new.cap_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.caps
    set library_count = greatest(0, library_count - 1), updated_at = now()
    where id = old.cap_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists user_cap_library_count_trg on public.user_cap_library;
create trigger user_cap_library_count_trg
  after insert or delete on public.user_cap_library
  for each row execute function public.bump_cap_library_count();

-- Caps kullanımı: başka kullanıcı, kullanıcı başına 1 sayım
create or replace function public.record_cap_usage(p_cap_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
  v_status public.cap_status;
  v_row_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select creator_id, status into v_creator_id, v_status
  from public.caps
  where id = p_cap_id;

  if not found then
    raise exception 'Caps bulunamadı';
  end if;

  if v_status <> 'published' then
    raise exception 'Bu caps kullanılamaz';
  end if;

  -- Üreticinin kendi kullanımı sayılmaz
  if v_creator_id = auth.uid() then
    return false;
  end if;

  insert into public.cap_usage (cap_id, user_id, first_used_at, last_used_at)
  values (p_cap_id, auth.uid(), now(), now())
  on conflict (cap_id, user_id) do update
    set last_used_at = now()
  returning cap_id into v_row_id;

  -- unique_user_count = distinct kullanıcı sayısı (idempotent)
  update public.caps c
  set
    unique_user_count = (
      select count(*)::integer from public.cap_usage u where u.cap_id = c.id
    ),
    last_used_at = now(),
    updated_at = now()
  where c.id = p_cap_id;

  return true;
end;
$$;

grant execute on function public.record_cap_usage(uuid) to authenticated;

-- Market / kütüphane yardımcı RPC: kütüphaneye ekle
create or replace function public.add_cap_to_library(p_cap_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
  v_status public.cap_status;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select creator_id, status into v_creator_id, v_status
  from public.caps where id = p_cap_id;

  if not found then
    raise exception 'Caps bulunamadı';
  end if;

  if v_status <> 'published' then
    raise exception 'Bu caps eklenemez';
  end if;

  insert into public.user_cap_library (user_id, cap_id, source)
  values (
    auth.uid(),
    p_cap_id,
    case when v_creator_id = auth.uid() then 'created'::public.cap_library_source
         else 'market'::public.cap_library_source end
  )
  on conflict (user_id, cap_id) do nothing;
end;
$$;

grant execute on function public.add_cap_to_library(uuid) to authenticated;

create or replace function public.remove_cap_from_library(p_cap_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  delete from public.user_cap_library
  where user_id = auth.uid() and cap_id = p_cap_id;
end;
$$;

grant execute on function public.remove_cap_from_library(uuid) to authenticated;

-- Üretici kendi caps'ini siler (soft)
create or replace function public.delete_own_cap(p_cap_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  update public.caps
  set status = 'removed', updated_at = now()
  where id = p_cap_id and creator_id = auth.uid();

  if not found then
    raise exception 'Caps silinemedi';
  end if;

  delete from public.user_cap_library where cap_id = p_cap_id;
end;
$$;

grant execute on function public.delete_own_cap(uuid) to authenticated;

-- Caps oluştur + otomatik kütüphaneye ekle
create or replace function public.create_cap(
  p_image_url text,
  p_storage_path text,
  p_thumb_url text default null,
  p_title text default null,
  p_width integer default null,
  p_height integer default null,
  p_video_url text default null,
  p_duration_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  select count(*)::integer into v_count
  from public.caps
  where creator_id = auth.uid() and status = 'published';

  if v_count >= 50 then
    raise exception 'En fazla 50 caps oluşturabilirsiniz';
  end if;

  insert into public.caps (
    creator_id, title, image_url, storage_path, thumb_url, video_url, duration_ms, width, height, status
  )
  values (
    auth.uid(),
    nullif(trim(p_title), ''),
    p_image_url,
    p_storage_path,
    p_thumb_url,
    p_video_url,
    p_duration_ms,
    p_width,
    p_height,
    'published'
  )
  returning id into v_id;

  insert into public.user_cap_library (user_id, cap_id, source)
  values (auth.uid(), v_id, 'created')
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.create_cap(text, text, text, text, integer, integer, text, integer) to authenticated;

-- RLS
alter table public.caps enable row level security;
alter table public.user_cap_library enable row level security;
alter table public.cap_usage enable row level security;

drop policy if exists "caps_public_read" on public.caps;
create policy "caps_public_read" on public.caps
  for select using (
    status = 'published'
    or creator_id = auth.uid()
  );

drop policy if exists "caps_creator_insert" on public.caps;
create policy "caps_creator_insert" on public.caps
  for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "caps_creator_update" on public.caps;
create policy "caps_creator_update" on public.caps
  for update to authenticated
  using (creator_id = auth.uid());

drop policy if exists "user_cap_library_own_read" on public.user_cap_library;
create policy "user_cap_library_own_read" on public.user_cap_library
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_cap_library_own_insert" on public.user_cap_library;
create policy "user_cap_library_own_insert" on public.user_cap_library
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_cap_library_own_delete" on public.user_cap_library;
create policy "user_cap_library_own_delete" on public.user_cap_library
  for delete to authenticated
  using (user_id = auth.uid());

-- Üretici kendi caps kullanım listesini görür; kullanıcı kendi kayıtlarını görür
drop policy if exists "cap_usage_read" on public.cap_usage;
create policy "cap_usage_read" on public.cap_usage
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.caps c
      where c.id = cap_usage.cap_id and c.creator_id = auth.uid()
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'caps',
  'caps',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
)
on conflict (id) do nothing;

drop policy if exists "Caps herkese açık" on storage.objects;
create policy "Caps herkese açık"
on storage.objects for select
using (bucket_id = 'caps');

drop policy if exists "Kullanıcı kendi caps yükleyebilir" on storage.objects;
create policy "Kullanıcı kendi caps yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'caps'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Kullanıcı kendi caps silebilir" on storage.objects;
create policy "Kullanıcı kendi caps silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'caps'
  and (storage.foldername(name))[1] = auth.uid()::text
);
