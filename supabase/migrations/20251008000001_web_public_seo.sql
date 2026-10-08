-- Vora web: public SEO yüzeyleri, blog CMS ve arama görünürlüğü.
-- Mevcut posts/profiles RLS politikalarına dokunmaz. Mobil akış aynı kalır.
-- Web yalnızca aşağıdaki görünümlerden okur; koordinat, IBAN, mesaj ve özel kitle dışarıda kalır.

alter table public.profiles
  add column if not exists web_search_visible boolean not null default false;

comment on column public.profiles.web_search_visible is
  'Kullanıcı herkese açık profilinin arama motorlarında dizine eklenmesine izin verdiyse true.';

-- ─── Güvenli okuma görünümleri ──────────────────────────────────────────────

create or replace view public.web_public_profiles
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.full_name,
  p.bio,
  p.avatar_url,
  p.cover_url,
  p.region_id,
  p.interests,
  p.is_verified,
  p.created_at,
  p.web_search_visible
from public.profiles p
where p.profile_visibility = 'public'
  and p.deleted_at is null
  and p.quarantined_at is null
  and coalesce(p.is_guest, false) = false
  and p.account_status = 'active';

create or replace view public.web_indexable_posts
with (security_invoker = true) as
select
  p.id,
  p.title,
  p.content,
  p.media_urls,
  p.region_id,
  p.category,
  p.created_at,
  p.updated_at,
  p.author_id,
  pr.username as author_username,
  pr.full_name as author_name,
  pr.avatar_url as author_avatar,
  pr.web_search_visible as author_search_visible
from public.posts p
join public.profiles pr on pr.id = p.author_id
where p.status = 'published'
  and p.audience = 'public'
  and p.is_sensitive = false
  and coalesce(p.requires_moderation, false) = false
  and pr.profile_visibility = 'public'
  and pr.deleted_at is null
  and pr.quarantined_at is null
  and pr.account_status = 'active'
  and coalesce(pr.is_guest, false) = false
  and char_length(trim(p.content)) >= 40;

create or replace view public.web_public_events
with (security_invoker = true) as
select
  e.id,
  e.title,
  e.description,
  e.cover_url,
  e.region_id,
  e.starts_at,
  e.ends_at,
  e.location_name,
  e.category,
  e.created_at,
  e.updated_at,
  e.organizer_id,
  case
    when pr.profile_visibility = 'public'
      and pr.deleted_at is null
      and pr.account_status = 'active'
    then pr.username
    else null
  end as organizer_username,
  case
    when pr.profile_visibility = 'public'
      and pr.deleted_at is null
      and pr.account_status = 'active'
    then pr.full_name
    else null
  end as organizer_name
from public.events e
left join public.profiles pr on pr.id = e.organizer_id
where e.status = 'published'
  and char_length(trim(e.description)) >= 40;

create or replace view public.web_public_hashtags
with (security_invoker = true) as
select
  h.tag,
  count(p.id)::integer as indexable_count
from public.hashtags h
join public.post_hashtags ph on ph.hashtag_id = h.id
join public.web_indexable_posts p on p.id = ph.post_id
where coalesce(h.is_hidden, false) = false
group by h.tag
having count(p.id) >= 8
  and count(distinct p.author_id) >= 3;

grant select on public.web_public_profiles to anon, authenticated;
grant select on public.web_indexable_posts to anon, authenticated;
grant select on public.web_public_events to anon, authenticated;
grant select on public.web_public_hashtags to anon, authenticated;

create or replace view public.web_hashtag_posts
with (security_invoker = true) as
select h.tag, p.id as post_id
from public.hashtags h
join public.post_hashtags ph on ph.hashtag_id = h.id
join public.web_indexable_posts p on p.id = ph.post_id
where coalesce(h.is_hidden, false) = false;

grant select on public.web_hashtag_posts to anon, authenticated;

-- ─── Blog ve web CMS ────────────────────────────────────────────────────────

create table if not exists public.web_blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  language text not null default 'tr',
  created_at timestamptz not null default now(),
  unique (language, slug)
);

create table if not exists public.web_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  language text not null default 'tr',
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  cover_image_alt text,
  gallery jsonb not null default '[]'::jsonb,
  video_url text,
  author_name text not null default 'Vora',
  category_id uuid references public.web_blog_categories (id) on delete set null,
  city_slug text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'trash')),
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_url text,
  faqs jsonb not null default '[]'::jsonb,
  internal_links jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (language, slug)
);

create table if not exists public.web_media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url text not null,
  filename text not null,
  alt text,
  title text,
  caption text,
  mime_type text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.web_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code integer not null default 301 check (status_code in (301, 302)),
  created_at timestamptz not null default now(),
  check (from_path <> to_path),
  check (from_path ~ '^/'),
  check (to_path ~ '^/')
);

create table if not exists public.web_pages (
  slug text primary key,
  title text not null,
  content_md text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

create table if not exists public.web_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.web_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text not null,
  content_type text,
  city_slug text,
  content_id text,
  created_at timestamptz not null default now()
);

alter table public.web_blog_categories enable row level security;
alter table public.web_blog_posts enable row level security;
alter table public.web_media enable row level security;
alter table public.web_redirects enable row level security;
alter table public.web_pages enable row level security;
alter table public.web_contact_messages enable row level security;
alter table public.web_analytics_events enable row level security;

drop policy if exists web_blog_categories_read on public.web_blog_categories;
create policy web_blog_categories_read on public.web_blog_categories
  for select using (true);
drop policy if exists web_blog_categories_admin on public.web_blog_categories;
create policy web_blog_categories_admin on public.web_blog_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_blog_posts_public_read on public.web_blog_posts;
create policy web_blog_posts_public_read on public.web_blog_posts
  for select using (status = 'published' or public.is_admin());
drop policy if exists web_blog_posts_admin on public.web_blog_posts;
create policy web_blog_posts_admin on public.web_blog_posts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_media_read on public.web_media;
create policy web_media_read on public.web_media
  for select using (true);
drop policy if exists web_media_admin on public.web_media;
create policy web_media_admin on public.web_media
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_redirects_read on public.web_redirects;
create policy web_redirects_read on public.web_redirects
  for select using (true);
drop policy if exists web_redirects_admin on public.web_redirects;
create policy web_redirects_admin on public.web_redirects
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_pages_public_read on public.web_pages;
create policy web_pages_public_read on public.web_pages
  for select using (status = 'published' or public.is_admin());
drop policy if exists web_pages_admin on public.web_pages;
create policy web_pages_admin on public.web_pages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_contact_insert on public.web_contact_messages;
create policy web_contact_insert on public.web_contact_messages
  for insert with check (
    char_length(name) between 2 and 80
    and char_length(email) between 5 and 160
    and char_length(message) between 10 and 4000
  );
drop policy if exists web_contact_admin_read on public.web_contact_messages;
create policy web_contact_admin_read on public.web_contact_messages
  for select using (public.is_admin());

drop policy if exists web_analytics_insert on public.web_analytics_events;
create policy web_analytics_insert on public.web_analytics_events
  for insert with check (
    event_name in (
      'web_page_view', 'blog_view', 'city_view', 'public_post_view',
      'profile_view', 'event_view', 'download_click', 'signup_click', 'app_open_click'
    )
    and char_length(path) between 1 and 300
  );
drop policy if exists web_analytics_admin_read on public.web_analytics_events;
create policy web_analytics_admin_read on public.web_analytics_events
  for select using (public.is_admin());

grant select on public.web_blog_categories to anon, authenticated;
grant select, insert, update, delete on public.web_blog_categories to authenticated;
grant select on public.web_blog_posts to anon, authenticated;
grant select, insert, update, delete on public.web_blog_posts to authenticated;
grant select on public.web_media to anon, authenticated;
grant select, insert, update, delete on public.web_media to authenticated;
grant select on public.web_redirects to anon, authenticated;
grant select, insert, update, delete on public.web_redirects to authenticated;
grant select on public.web_pages to anon, authenticated;
grant select, insert, update, delete on public.web_pages to authenticated;
grant insert on public.web_contact_messages to anon, authenticated;
grant select on public.web_contact_messages to authenticated;
grant insert on public.web_analytics_events to anon, authenticated;
grant select on public.web_analytics_events to authenticated;

create or replace function public.web_redirects_guard()
returns trigger
language plpgsql
as $$
declare
  hop text;
  depth int := 0;
begin
  if new.from_path = new.to_path then
    raise exception 'redirect loop';
  end if;
  if exists (
    select 1 from public.web_redirects r
    where r.from_path = new.to_path and r.to_path = new.from_path and r.id is distinct from new.id
  ) then
    raise exception 'redirect loop';
  end if;
  hop := new.to_path;
  while hop is not null and depth < 5 loop
    if hop = new.from_path then
      raise exception 'redirect loop';
    end if;
    select r.to_path into hop from public.web_redirects r where r.from_path = hop limit 1;
    depth := depth + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists web_redirects_guard on public.web_redirects;
create trigger web_redirects_guard
  before insert or update on public.web_redirects
  for each row execute function public.web_redirects_guard();

insert into public.web_blog_categories (slug, name, description, language)
values
  ('karadeniz', 'Karadeniz', 'Bölgenin kıyısı, yaylaları ve günlük hayatı.', 'tr'),
  ('sehir-rehberleri', 'Şehir Rehberleri', 'Bir şehri tanımak için pratik rehberler.', 'tr'),
  ('sosyal-yasam', 'Sosyal Yaşam', 'Yeni bir çevrede bağ kurmak.', 'tr'),
  ('gezi', 'Gezi', 'Gezilecek yerler ve yerel rotalar.', 'tr'),
  ('etkinlikler', 'Etkinlikler', 'Şehirde buluşma ve etkinlik kültürü.', 'tr'),
  ('insanlar-ve-topluluklar', 'İnsanlar ve Topluluklar', 'Mahalle, üniversite ve şehir toplulukları.', 'tr'),
  ('vora-haberleri', 'Vora Haberleri', 'Ürün ve topluluk duyuruları.', 'tr'),
  ('sehir-kulturu', 'Şehir Kültürü', 'Yerel alışkanlıklar ve kültürel yapı.', 'tr'),
  ('yeni-insanlarla-tanisma', 'Yeni İnsanlarla Tanışma', 'Güvenli ve gündelik tanışma yolları.', 'tr')
on conflict (language, slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'web-media',
  'web-media',
  true,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do nothing;

drop policy if exists "web_media_public_read" on storage.objects;
create policy "web_media_public_read"
on storage.objects for select
using (bucket_id = 'web-media');

drop policy if exists "web_media_admin_insert" on storage.objects;
create policy "web_media_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'web-media' and public.is_admin());

drop policy if exists "web_media_admin_update" on storage.objects;
create policy "web_media_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'web-media' and public.is_admin())
with check (bucket_id = 'web-media' and public.is_admin());

drop policy if exists "web_media_admin_delete" on storage.objects;
create policy "web_media_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'web-media' and public.is_admin());
