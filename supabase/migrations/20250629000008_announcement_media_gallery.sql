-- Duyuru galeri desteği: tek medya yerine sıralı çoklu resim + video.
-- Yeni `media` jsonb dizisi: [{ type: 'image'|'video', url, thumbnail_url }]
-- Eski tekil sütunlar (media_type/media_url/thumbnail_url) geriye dönük uyum
-- için ilk medya öğesinden türetilir.

alter table public.announcements
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Var olan tekil medyaları yeni galeri formatına taşı.
update public.announcements
set media = jsonb_build_array(
  jsonb_build_object(
    'type', media_type,
    'url', media_url,
    'thumbnail_url', thumbnail_url
  )
)
where media_type in ('image', 'video')
  and media_url is not null
  and (media is null or jsonb_array_length(media) = 0);

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
    'media', coalesce(a.media, '[]'::jsonb),
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

-- Eski imzaları kaldır (overload belirsizliğini önlemek için yeniden oluşturuyoruz).
drop function if exists public.create_announcement(text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int);
drop function if exists public.update_announcement(uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, boolean);

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
  p_priority int default 0,
  p_media jsonb default '[]'::jsonb
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
  v_media jsonb := coalesce(p_media, '[]'::jsonb);
  v_first jsonb := case when jsonb_array_length(v_media) > 0 then v_media->0 else null end;
  v_media_type text := coalesce(v_first->>'type', p_media_type, 'none');
  v_media_url text := coalesce(v_first->>'url', p_media_url);
  v_thumbnail_url text := coalesce(v_first->>'thumbnail_url', p_thumbnail_url);
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

  if v_media_type not in ('none', 'image', 'video') then
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
    title, body, media_type, media_url, thumbnail_url, media, link_url, link_label,
    accent, region_id, starts_at, ends_at,
    is_pinned, priority,
    author_id, business_id, author_name, author_avatar_url
  ) values (
    trim(p_title), coalesce(p_body, ''), v_media_type, v_media_url, v_thumbnail_url, v_media, p_link_url, p_link_label,
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
  p_is_active boolean default true,
  p_media jsonb default '[]'::jsonb
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
  v_media jsonb := coalesce(p_media, '[]'::jsonb);
  v_first jsonb := case when jsonb_array_length(v_media) > 0 then v_media->0 else null end;
  v_media_type text := coalesce(v_first->>'type', p_media_type, 'none');
  v_media_url text := coalesce(v_first->>'url', p_media_url);
  v_thumbnail_url text := coalesce(v_first->>'thumbnail_url', p_thumbnail_url);
  v_row public.announcements;
begin
  select * into v_row from public.announcements where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;

  if not v_is_mod and v_row.author_id <> v_uid then
    raise exception 'forbidden';
  end if;

  if v_media_type not in ('none', 'image', 'video') then
    raise exception 'invalid_media_type';
  end if;

  update public.announcements
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    body = coalesce(p_body, ''),
    media_type = v_media_type,
    media_url = v_media_url,
    thumbnail_url = v_thumbnail_url,
    media = v_media,
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

revoke all on function public.create_announcement(text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, jsonb) from public;
revoke all on function public.update_announcement(uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, boolean, jsonb) from public;

grant execute on function public.create_announcement(text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, jsonb) to authenticated;
grant execute on function public.update_announcement(uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, int, boolean, jsonb) to authenticated;
