-- Platform rehberi: cüzdan, puan, özellik tanıtımı ve kullanım politikaları

create table if not exists public.platform_guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  summary text not null default '',
  icon text not null default 'book-outline',
  category text not null default 'general',
  sections jsonb not null default '[]'::jsonb,
  image_url text,
  video_url text,
  footer_note text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_guides_slug_unique unique (slug),
  constraint platform_guides_category_check check (
    category in ('wallet', 'points', 'features', 'policy', 'general')
  )
);

create index if not exists platform_guides_published_sort_idx
  on public.platform_guides (is_published, sort_order asc, published_at desc nulls last);

alter table public.platform_guides enable row level security;

drop policy if exists platform_guides_public_read on public.platform_guides;
create policy platform_guides_public_read on public.platform_guides
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists platform_guides_admin_all on public.platform_guides;
create policy platform_guides_admin_all on public.platform_guides
  for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_admin());

create trigger platform_guides_updated_at
  before update on public.platform_guides
  for each row execute function public.set_updated_at();

-- Medya depolama
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-guide-media',
  'platform-guide-media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do nothing;

drop policy if exists platform_guide_media_read on storage.objects;
create policy platform_guide_media_read on storage.objects
  for select using (bucket_id = 'platform-guide-media');

drop policy if exists platform_guide_media_admin_insert on storage.objects;
create policy platform_guide_media_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'platform-guide-media'
    and public.is_moderator()
  );

drop policy if exists platform_guide_media_admin_update on storage.objects;
create policy platform_guide_media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'platform-guide-media' and public.is_moderator());

drop policy if exists platform_guide_media_admin_delete on storage.objects;
create policy platform_guide_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'platform-guide-media' and public.is_moderator());

-- Yayınlanmış rehber listesi (herkese açık)
create or replace function public.list_platform_guides()
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  icon text,
  category text,
  sort_order int,
  published_at timestamptz,
  has_image boolean,
  has_video boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.slug,
    g.title,
    g.summary,
    g.icon,
    g.category,
    g.sort_order,
    g.published_at,
    (g.image_url is not null and g.image_url <> '') as has_image,
    (g.video_url is not null and g.video_url <> '') as has_video
  from public.platform_guides g
  where g.is_published = true
  order by g.sort_order asc, g.published_at desc nulls last, g.title asc;
$$;

-- Tek rehber detayı
create or replace function public.get_platform_guide(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.platform_guides%rowtype;
begin
  select * into v_row
  from public.platform_guides
  where slug = p_slug and is_published = true;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'slug', v_row.slug,
    'title', v_row.title,
    'summary', v_row.summary,
    'icon', v_row.icon,
    'category', v_row.category,
    'sections', v_row.sections,
    'image_url', v_row.image_url,
    'video_url', v_row.video_url,
    'footer_note', v_row.footer_note,
    'published_at', v_row.published_at
  );
end;
$$;

-- Admin: tüm rehberler
create or replace function public.admin_list_platform_guides()
returns setof public.platform_guides
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select *
  from public.platform_guides
  order by sort_order asc, updated_at desc;
end;
$$;

-- Admin: kaydet (taslak veya yayın)
create or replace function public.admin_save_platform_guide(
  p_id uuid default null,
  p_slug text default null,
  p_title text default null,
  p_summary text default '',
  p_icon text default 'book-outline',
  p_category text default 'general',
  p_sections jsonb default '[]'::jsonb,
  p_image_url text default null,
  p_video_url text default null,
  p_footer_note text default null,
  p_sort_order int default 0,
  p_is_published boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Başlık gerekli';
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' then
    raise exception 'Kısa bağlantı (slug) gerekli';
  end if;

  if p_id is null then
    insert into public.platform_guides (
      slug, title, summary, icon, category, sections,
      image_url, video_url, footer_note, sort_order,
      is_published, published_at, created_by
    )
    values (
      v_slug,
      trim(p_title),
      coalesce(trim(p_summary), ''),
      coalesce(nullif(trim(p_icon), ''), 'book-outline'),
      coalesce(nullif(trim(p_category), ''), 'general'),
      coalesce(p_sections, '[]'::jsonb),
      nullif(trim(p_image_url), ''),
      nullif(trim(p_video_url), ''),
      nullif(trim(p_footer_note), ''),
      coalesce(p_sort_order, 0),
      coalesce(p_is_published, false),
      case when coalesce(p_is_published, false) then now() else null end,
      auth.uid()
    )
    returning id into v_id;
  else
    update public.platform_guides
    set
      slug = v_slug,
      title = trim(p_title),
      summary = coalesce(trim(p_summary), ''),
      icon = coalesce(nullif(trim(p_icon), ''), 'book-outline'),
      category = coalesce(nullif(trim(p_category), ''), 'general'),
      sections = coalesce(p_sections, '[]'::jsonb),
      image_url = nullif(trim(p_image_url), ''),
      video_url = nullif(trim(p_video_url), ''),
      footer_note = nullif(trim(p_footer_note), ''),
      sort_order = coalesce(p_sort_order, 0),
      is_published = coalesce(p_is_published, false),
      published_at = case
        when coalesce(p_is_published, false) and published_at is null then now()
        when not coalesce(p_is_published, false) then null
        else published_at
      end
    where id = p_id
    returning id into v_id;

    if not found then
      raise exception 'Rehber bulunamadı';
    end if;
  end if;

  return v_id;
end;
$$;

-- Admin: bildirim alıcı sayısı
create or replace function public.admin_preview_platform_guide_recipients()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select count(*)::int into v_count
  from public.profiles p
  where coalesce((p.notification_prefs->>'system')::boolean, true);

  return coalesce(v_count, 0);
end;
$$;

-- Admin: yayınla + isteğe bağlı bildirim
create or replace function public.admin_publish_platform_guide(
  p_id uuid,
  p_notify boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guide public.platform_guides%rowtype;
  v_count int := 0;
  v_title text;
  v_body text;
  v_data jsonb;
  v_recipient record;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_guide from public.platform_guides where id = p_id;
  if not found then
    raise exception 'Rehber bulunamadı';
  end if;

  update public.platform_guides
  set is_published = true, published_at = coalesce(published_at, now())
  where id = p_id;

  if not coalesce(p_notify, false) then
    return 0;
  end if;

  v_title := v_guide.title;
  v_body := coalesce(nullif(trim(v_guide.summary), ''), 'Yeni bir platform rehberi yayınlandı. Detaylar için dokunun.');
  v_data := jsonb_build_object(
    'kind', 'platform_guide_published',
    'deep_link', '/settings/platform-guide/' || v_guide.slug,
    'guide_id', v_guide.id::text,
    'guide_slug', v_guide.slug,
    'broadcast', true,
    'sender_label', 'Vora'
  );

  for v_recipient in
    select p.id
    from public.profiles p
    where coalesce((p.notification_prefs->>'system')::boolean, true)
      and not exists (
        select 1
        from public.notification_outbox o
        where o.recipient_id = p.id
          and o.data->>'guide_id' = v_guide.id::text
          and o.created_at > now() - interval '24 hours'
      )
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, 'system'::public.notification_event_type, v_title, v_body, v_data, null);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_recipient.id,
      'system'::public.notification_event_type,
      v_title,
      v_body,
      v_data,
      null,
      'system'::public.notification_category,
      'normal'::public.notification_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Admin: sil
create or replace function public.admin_delete_platform_guide(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  delete from public.platform_guides where id = p_id;

  if not found then
    raise exception 'Rehber bulunamadı';
  end if;
end;
$$;

grant execute on function public.list_platform_guides() to anon, authenticated;
grant execute on function public.get_platform_guide(text) to anon, authenticated;
grant execute on function public.admin_list_platform_guides() to authenticated;
grant execute on function public.admin_save_platform_guide(uuid, text, text, text, text, text, jsonb, text, text, text, int, boolean) to authenticated;
grant execute on function public.admin_preview_platform_guide_recipients() to authenticated;
grant execute on function public.admin_publish_platform_guide(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_platform_guide(uuid) to authenticated;

-- Başlangıç rehberleri (admin düzenleyebilir)
insert into public.platform_guides (
  slug, title, summary, icon, category, sort_order, is_published, published_at, sections
)
values
  (
    'cuzdan',
    'Cüzdan Nasıl Kullanılır?',
    'Kazançlarınızı, ödemelerinizi ve cüzdan hareketlerinizi tek yerden takip edin.',
    'wallet-outline',
    'wallet',
    10,
    true,
    now(),
    jsonb_build_array(
      jsonb_build_object(
        'heading', 'Cüzdan nedir?',
        'body', 'Cüzdan; Yerel Pazar, paylaşımlı yolculuk ve otel kazançlarınızı görebileceğiniz, ödeme durumlarını takip edebileceğiniz merkezi alandır.'
      ),
      jsonb_build_object(
        'heading', 'Hareket geçmişi',
        'body', 'Her işlem için tarih, tutar ve durum bilgisi görüntülenir. Detaya dokunarak tam açıklamayı okuyabilirsiniz.'
      ),
      jsonb_build_object(
        'heading', 'Ödeme alma',
        'body', 'IBAN bilginizi profilinizde tanımladığınızda platform ödemeleri bu hesaba yönlendirilir. Ödeme planı ve tamamlanan transferler cüzdanda listelenir.'
      )
    )
  ),
  (
    'guven-puani',
    'Güven Puanı Sistemi',
    'Topluluk güveninizi artıran davranışlar puan kazandırır; ihlaller puan düşürür.',
    'shield-checkmark-outline',
    'points',
    20,
    true,
    now(),
    jsonb_build_array(
      jsonb_build_object(
        'heading', 'Puan ne işe yarar?',
        'body', 'Güven puanı; doğrulanmış içerik paylaşımı, kimlik doğrulama ve temiz geçmiş gibi olumlu davranışlarla artar. Yüksek puan profilinizde güvenilirlik sinyali oluşturur.'
      ),
      jsonb_build_object(
        'heading', 'Puan nasıl kazanılır?',
        'body', 'Doğrulanmış olay bildirimi, faydalı yorum, etkinlik katılımı, kimlik doğrulama ve uzun süreli temiz geçmiş puan kazandırır.'
      ),
      jsonb_build_object(
        'heading', 'Puan düşüşü',
        'body', 'Şikayet, moderasyon cezası veya topluluk kurallarına aykırı davranışlar puanınızı düşürebilir. Detaylar cüzdan hareketlerinde görünür.'
      )
    )
  ),
  (
    'platforma-genel-bakis',
    'Platforma Genel Bakış',
    'Vora''daki merkezler, programlar ve temel özelliklerin kısa özeti.',
    'compass-outline',
    'features',
    30,
    true,
    now(),
    jsonb_build_array(
      jsonb_build_object(
        'heading', 'Merkezler',
        'body', 'Personel, etkinlik, kayıp, yardım, pazar ve daha fazlası — her ihtiyaç için ayrı bir merkez bulunur. Ayarlar > Merkezler bölümünden hepsine ulaşabilirsiniz.'
      ),
      jsonb_build_object(
        'heading', 'Harita ve bölgesel içerik',
        'body', 'Harita üzerinden olayları, etkinlikleri ve kayıp ilanlarını bölgenize göre keşfedebilirsiniz.'
      ),
      jsonb_build_object(
        'heading', 'Güven ve destek',
        'body', 'Güven Merkezi, Destek Merkezi ve Canlı Destek ile hesabınızı güvende tutabilir, sorularınıza yanıt alabilirsiniz.'
      )
    )
  )
on conflict (slug) do nothing;
