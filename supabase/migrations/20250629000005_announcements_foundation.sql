-- Duyuru Panosu: feed üstünde gösterilen, admin + onaylı işletmelerin oluşturduğu
-- video / resim / metin / tıklanabilir linkli zengin duyurular.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  media_type text not null default 'none' check (media_type in ('none', 'image', 'video')),
  media_url text,
  thumbnail_url text,
  link_url text,
  link_label text,
  accent text not null default '#1E88E5',
  is_pinned boolean not null default false,
  is_active boolean not null default true,
  priority int not null default 0,
  region_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  author_name text,
  author_avatar_url text,
  view_count int not null default 0,
  cta_click_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_active_idx
  on public.announcements (is_pinned desc, priority desc, created_at desc)
  where is_active = true;

create index if not exists announcements_author_idx
  on public.announcements (author_id, created_at desc);

create index if not exists announcements_region_idx
  on public.announcements (region_id)
  where is_active = true;

alter table public.announcements enable row level security;

-- Aktif duyuruları herkes görebilir; sahibi ve moderatör kendi/tüm kayıtları görür.
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to anon, authenticated
  using (
    is_active = true
    or author_id = auth.uid()
    or public.is_moderator()
  );

-- Yazma işlemleri yalnızca SECURITY DEFINER RPC'ler üzerinden yapılır.
grant select on public.announcements to anon, authenticated;

-- Çağıranın duyuru oluşturma yetkisi var mı? (moderatör veya onaylı işletme sahibi)
create or replace function public.announcement_owned_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from public.businesses b
  where b.owner_id = auth.uid()
    and b.registration_status = 'approved'
  order by b.registration_approved_at desc nulls last
  limit 1;
$$;

create or replace function public.announcement_to_json(a public.announcements)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'body', a.body,
    'media_type', a.media_type,
    'media_url', a.media_url,
    'thumbnail_url', a.thumbnail_url,
    'link_url', a.link_url,
    'link_label', a.link_label,
    'accent', a.accent,
    'is_pinned', a.is_pinned,
    'is_active', a.is_active,
    'priority', a.priority,
    'region_id', a.region_id,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'author_id', a.author_id,
    'business_id', a.business_id,
    'author_name', a.author_name,
    'author_avatar_url', a.author_avatar_url,
    'view_count', a.view_count,
    'cta_click_count', a.cta_click_count,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  );
$$;

-- Feed şeridi için aktif duyurular (bölge filtreli + zaman penceresi).
create or replace function public.fetch_active_announcements(p_region_id text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      public.announcement_to_json(a)
      order by a.is_pinned desc, a.priority desc, a.created_at desc
    ),
    '[]'::jsonb
  )
  from public.announcements a
  where a.is_active = true
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at is null or a.ends_at >= now())
    and (
      p_region_id is null
      or a.region_id is null
      or a.region_id = p_region_id
    );
$$;

-- İşletme sahibinin / moderatörün kendi duyurularını yönetmesi için.
create or replace function public.list_my_announcements()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      public.announcement_to_json(a)
      order by a.created_at desc
    ),
    '[]'::jsonb
  )
  from public.announcements a
  where a.author_id = auth.uid();
$$;

create or replace function public.record_announcement_view(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.announcements
  set view_count = view_count + 1
  where id = p_id and is_active = true;
$$;

create or replace function public.record_announcement_cta_click(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.announcements
  set cta_click_count = cta_click_count + 1
  where id = p_id;
$$;

create or replace function public.create_announcement(
  p_title text,
  p_body text default '',
  p_media_type text default 'none',
  p_media_url text default null,
  p_thumbnail_url text default null,
  p_link_url text default null,
  p_link_label text default null,
  p_accent text default '#1E88E5',
  p_region_id text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_is_pinned boolean default false,
  p_priority int default 0
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_mod boolean := public.is_moderator();
  v_business_id uuid := public.announcement_owned_business_id();
  v_business_name text;
  v_business_logo text;
  v_author_name text;
  v_author_avatar text;
  v_row public.announcements;
begin
  if v_uid is null then
    raise exception 'forbidden';
  end if;

  if not v_is_mod and v_business_id is null then
    raise exception 'forbidden';
  end if;

  if p_title is null or char_length(trim(p_title)) < 2 then
    raise exception 'title_required';
  end if;

  if p_media_type not in ('none', 'image', 'video') then
    raise exception 'invalid_media_type';
  end if;

  if v_business_id is not null then
    select b.name, b.logo_url into v_business_name, v_business_logo
    from public.businesses b where b.id = v_business_id;
    v_author_name := coalesce(v_business_name, 'İşletme');
    v_author_avatar := v_business_logo;
  else
    v_author_name := 'Vora';
    v_author_avatar := null;
  end if;

  insert into public.announcements (
    title, body, media_type, media_url, thumbnail_url, link_url, link_label,
    accent, region_id, starts_at, ends_at,
    is_pinned, priority,
    author_id, business_id, author_name, author_avatar_url
  ) values (
    trim(p_title), coalesce(p_body, ''), p_media_type, p_media_url, p_thumbnail_url, p_link_url, p_link_label,
    coalesce(nullif(trim(p_accent), ''), '#1E88E5'), p_region_id, p_starts_at, p_ends_at,
    -- yalnızca moderatör sabitleyebilir / öncelik verebilir
    case when v_is_mod then coalesce(p_is_pinned, false) else false end,
    case when v_is_mod then coalesce(p_priority, 0) else 0 end,
    v_uid, v_business_id, v_author_name, v_author_avatar
  )
  returning * into v_row;

  return public.announcement_to_json(v_row);
end;
$$;

create or replace function public.update_announcement(
  p_id uuid,
  p_title text,
  p_body text default '',
  p_media_type text default 'none',
  p_media_url text default null,
  p_thumbnail_url text default null,
  p_link_url text default null,
  p_link_label text default null,
  p_accent text default '#1E88E5',
  p_region_id text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_is_pinned boolean default false,
  p_priority int default 0,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_mod boolean := public.is_moderator();
  v_row public.announcements;
begin
  select * into v_row from public.announcements where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;

  if not v_is_mod and v_row.author_id <> v_uid then
    raise exception 'forbidden';
  end if;

  if p_media_type not in ('none', 'image', 'video') then
    raise exception 'invalid_media_type';
  end if;

  update public.announcements
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    body = coalesce(p_body, ''),
    media_type = p_media_type,
    media_url = p_media_url,
    thumbnail_url = p_thumbnail_url,
    link_url = p_link_url,
    link_label = p_link_label,
    accent = coalesce(nullif(trim(p_accent), ''), '#1E88E5'),
    region_id = p_region_id,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    is_pinned = case when v_is_mod then coalesce(p_is_pinned, false) else is_pinned end,
    priority = case when v_is_mod then coalesce(p_priority, 0) else priority end,
    is_active = coalesce(p_is_active, true),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  return public.announcement_to_json(v_row);
end;
$$;

create or replace function public.delete_announcement(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_mod boolean := public.is_moderator();
  v_author uuid;
begin
  select author_id into v_author from public.announcements where id = p_id;
  if not found then
    return;
  end if;
  if not v_is_mod and v_author <> v_uid then
    raise exception 'forbidden';
  end if;
  delete from public.announcements where id = p_id;
end;
$$;

create or replace function public.admin_list_announcements()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      public.announcement_to_json(a)
      order by a.is_pinned desc, a.priority desc, a.created_at desc
    ),
    '[]'::jsonb
  )
  from public.announcements a
  where public.is_moderator();
$$;

revoke all on function public.fetch_active_announcements(text) from public;
revoke all on function public.list_my_announcements() from public;
revoke all on function public.create_announcement(text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int) from public;
revoke all on function public.update_announcement(uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, boolean) from public;
revoke all on function public.delete_announcement(uuid) from public;
revoke all on function public.admin_list_announcements() from public;

grant execute on function public.fetch_active_announcements(text) to anon, authenticated;
grant execute on function public.record_announcement_view(uuid) to anon, authenticated;
grant execute on function public.record_announcement_cta_click(uuid) to anon, authenticated;
grant execute on function public.list_my_announcements() to authenticated;
grant execute on function public.create_announcement(text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int) to authenticated;
grant execute on function public.update_announcement(uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, boolean) to authenticated;
grant execute on function public.delete_announcement(uuid) to authenticated;
grant execute on function public.admin_list_announcements() to authenticated;

-- Duyuru medyası (resim + video) için ayrı public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcements',
  'announcements',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "Duyuru medyası okuma" on storage.objects;
create policy "Duyuru medyası okuma"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'announcements');

drop policy if exists "Duyuru medyası yükleme" on storage.objects;
create policy "Duyuru medyası yükleme"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'announcements'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Duyuru medyası silme" on storage.objects;
create policy "Duyuru medyası silme"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'announcements'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_moderator())
);
