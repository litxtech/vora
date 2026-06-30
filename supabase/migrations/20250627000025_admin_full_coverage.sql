-- Admin panel tam kapsam: hesap bağlama, yakınlık, kaşif, davet, mağaza, otel, tanıtım, rozetler, anket

-- ─── Hesap bağlama ───────────────────────────────────────────────────────────

create or replace function public.admin_list_account_link_requests(
  p_status text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  requester_id uuid,
  requester_username text,
  target_user_id uuid,
  target_username text,
  status public.account_link_request_status,
  created_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    r.id,
    r.requester_id,
    pr.username as requester_username,
    r.target_user_id,
    pt.username as target_username,
    r.status,
    r.created_at,
    r.expires_at,
    r.responded_at
  from public.account_link_requests r
  join public.profiles pr on pr.id = r.requester_id
  join public.profiles pt on pt.id = r.target_user_id
  where (p_status = 'all' or r.status::text = p_status)
  order by r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_list_linked_accounts(p_limit int default 50)
returns table (
  id uuid,
  personal_user_id uuid,
  personal_username text,
  business_user_id uuid,
  business_username text,
  linked_by uuid,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    la.id,
    la.personal_user_id,
    pp.username as personal_username,
    la.business_user_id,
    pb.username as business_username,
    la.linked_by,
    la.linked_at
  from public.linked_accounts la
  join public.profiles pp on pp.id = la.personal_user_id
  join public.profiles pb on pb.id = la.business_user_id
  order by la.linked_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_cancel_account_link_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.account_link_requests
  set status = 'cancelled', responded_at = now()
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'request not found';
  end if;
end;
$$;

create or replace function public.admin_force_unlink_accounts(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.linked_accounts where id = p_link_id;

  if not found then
    raise exception 'link not found';
  end if;
end;
$$;

-- ─── Yakınlık eşleşmesi ──────────────────────────────────────────────────────

create or replace function public.admin_list_proximity_presence(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  region_id text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.user_id,
    pr.username,
    p.region_id,
    p.latitude,
    p.longitude,
    p.updated_at
  from public.proximity_match_presence p
  join public.profiles pr on pr.id = p.user_id
  order by p.updated_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_list_proximity_interactions(p_limit int default 50)
returns table (
  user_low uuid,
  user_low_username text,
  user_high uuid,
  user_high_username text,
  low_decision text,
  high_decision text,
  matched_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    i.user_low,
    pl.username as user_low_username,
    i.user_high,
    ph.username as user_high_username,
    i.low_decision,
    i.high_decision,
    i.matched_at,
    i.created_at
  from public.proximity_match_interactions i
  join public.profiles pl on pl.id = i.user_low
  join public.profiles ph on ph.id = i.user_high
  order by coalesce(i.matched_at, i.created_at) desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_clear_proximity_presence(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  delete from public.proximity_match_presence where user_id = p_user_id;
end;
$$;

-- ─── Kaşif modu ──────────────────────────────────────────────────────────────

create or replace function public.admin_list_explorer_presence(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  region_id text,
  latitude double precision,
  longitude double precision,
  is_visible boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    e.user_id,
    pr.username,
    e.region_id,
    e.latitude,
    e.longitude,
    e.is_visible,
    e.updated_at
  from public.explorer_presence e
  join public.profiles pr on pr.id = e.user_id
  order by e.updated_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_hide_explorer_presence(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  update public.explorer_presence
  set is_visible = false, updated_at = now()
  where user_id = p_user_id;

  if not found then
    delete from public.explorer_presence where user_id = p_user_id;
  end if;
end;
$$;

-- ─── Arkadaş daveti ──────────────────────────────────────────────────────────

create or replace function public.admin_friend_invite_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_today int;
  v_week int;
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  select count(*)::int into v_total from public.friend_invite_redemptions;
  select count(*)::int into v_today
  from public.friend_invite_redemptions
  where created_at >= date_trunc('day', now());
  select count(*)::int into v_week
  from public.friend_invite_redemptions
  where created_at >= now() - interval '7 days';

  return jsonb_build_object(
    'total_redemptions', v_total,
    'redemptions_today', v_today,
    'redemptions_week', v_week
  );
end;
$$;

create or replace function public.admin_list_friend_invite_redemptions(p_limit int default 50)
returns table (
  id uuid,
  inviter_id uuid,
  inviter_username text,
  invitee_id uuid,
  invitee_username text,
  invite_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    r.id,
    r.inviter_id,
    pi.username as inviter_username,
    r.invitee_id,
    pe.username as invitee_username,
    r.invite_code,
    r.created_at
  from public.friend_invite_redemptions r
  join public.profiles pi on pi.id = r.inviter_id
  join public.profiles pe on pe.id = r.invitee_id
  order by r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ─── İşletme mağazası ────────────────────────────────────────────────────────

create or replace function public.admin_list_business_shops(
  p_filter text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  name text,
  owner_id uuid,
  owner_username text,
  commerce_mode public.business_commerce_mode,
  shop_published boolean,
  shop_tagline text,
  view_count integer,
  registration_status text,
  active_boosts integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    b.id,
    b.name,
    b.owner_id,
    p.username as owner_username,
    b.commerce_mode,
    b.shop_published,
    b.shop_tagline,
    coalesce(b.view_count, 0) as view_count,
    b.registration_status::text,
    (
      select count(*)::int
      from public.business_shop_boosts bb
      where bb.business_id = b.id and bb.status = 'active'
    ) as active_boosts,
    b.created_at
  from public.businesses b
  join public.profiles p on p.id = b.owner_id
  where b.registration_status = 'approved'
    and (
      p_filter = 'all'
      or (p_filter = 'published' and b.shop_published = true)
      or (p_filter = 'unpublished' and b.shop_published = false)
      or (p_filter = 'commerce' and b.commerce_mode <> 'none')
    )
  order by b.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_list_business_shop_boosts(p_limit int default 50)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  owner_username text,
  package_tier public.business_shop_boost_tier,
  status public.business_shop_boost_status,
  price_cents integer,
  impressions integer,
  shop_views integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    bb.id,
    bb.business_id,
    b.name as business_name,
    p.username as owner_username,
    bb.package_tier,
    bb.status,
    bb.price_cents,
    bb.impressions,
    bb.shop_views,
    bb.starts_at,
    bb.ends_at,
    bb.created_at
  from public.business_shop_boosts bb
  join public.businesses b on b.id = bb.business_id
  join public.profiles p on p.id = bb.owner_id
  order by bb.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_set_business_shop_published(
  p_business_id uuid,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.businesses
  set shop_published = p_published
  where id = p_business_id and registration_status = 'approved';

  if not found then
    raise exception 'business not found';
  end if;
end;
$$;

create or replace function public.admin_cancel_business_shop_boost(p_boost_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.business_shop_boosts
  set status = 'cancelled', updated_at = now()
  where id = p_boost_id and status in ('pending', 'active');

  if not found then
    raise exception 'boost not found';
  end if;
end;
$$;

-- ─── Otel ilanları ───────────────────────────────────────────────────────────

create or replace function public.admin_list_hotel_listings(
  p_status text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  name text,
  owner_id uuid,
  owner_username text,
  region_id text,
  district text,
  price_per_night integer,
  status public.hotel_listing_status,
  avg_rating numeric,
  review_count integer,
  view_count integer,
  is_featured boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    h.id,
    h.name,
    h.owner_id,
    p.username as owner_username,
    h.region_id,
    h.district,
    h.price_per_night,
    h.status,
    h.avg_rating,
    h.review_count,
    h.view_count,
    h.is_featured,
    h.created_at
  from public.hotel_listings h
  join public.profiles p on p.id = h.owner_id
  where p_status = 'all' or h.status::text = p_status
  order by h.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_moderate_hotel_listing(
  p_hotel_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  case p_action
    when 'pause' then
      update public.hotel_listings set status = 'paused', updated_at = now() where id = p_hotel_id;
    when 'publish' then
      update public.hotel_listings set status = 'published', updated_at = now() where id = p_hotel_id;
    when 'feature' then
      update public.hotel_listings set is_featured = true, updated_at = now() where id = p_hotel_id;
    when 'unfeature' then
      update public.hotel_listings set is_featured = false, updated_at = now() where id = p_hotel_id;
    else
      raise exception 'invalid action';
  end case;

  if not found then
    raise exception 'hotel not found';
  end if;
end;
$$;

create or replace function public.admin_list_hotel_reviews(p_limit int default 50)
returns table (
  id uuid,
  hotel_id uuid,
  hotel_name text,
  reviewer_id uuid,
  reviewer_username text,
  rating smallint,
  comment text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    r.id,
    r.hotel_id,
    h.name as hotel_name,
    r.reviewer_id,
    p.username as reviewer_username,
    r.rating,
    r.comment,
    r.created_at
  from public.hotel_reviews r
  join public.hotel_listings h on h.id = r.hotel_id
  join public.profiles p on p.id = r.reviewer_id
  order by r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_delete_hotel_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  delete from public.hotel_reviews where id = p_review_id;

  if not found then
    raise exception 'review not found';
  end if;
end;
$$;

-- ─── Rozetler (Öncü / Vora İkonu) ────────────────────────────────────────────

create or replace function public.admin_list_badge_holders(
  p_badge_type text default 'all',
  p_limit int default 50
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  is_pioneer boolean,
  is_platform_charm boolean,
  granted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id as user_id,
    p.username,
    p.full_name,
    p.is_pioneer,
    p.is_platform_charm,
    coalesce(
      (
        select max(ub.earned_at)
        from public.user_badges ub
        where ub.user_id = p.id
          and (
            (p_badge_type = 'pioneer' and ub.badge_type = 'pioneer')
            or (p_badge_type = 'platform_charm' and ub.badge_type = 'platform_charm')
            or (p_badge_type = 'all' and ub.badge_type in ('pioneer', 'platform_charm'))
          )
      ),
      p.updated_at
    ) as granted_at
  from public.profiles p
  where (
    (p_badge_type = 'all' and (p.is_pioneer or p.is_platform_charm))
    or (p_badge_type = 'pioneer' and p.is_pioneer)
    or (p_badge_type = 'platform_charm' and p.is_platform_charm)
  )
  order by granted_at desc nulls last
  limit greatest(p_limit, 1);
end;
$$;

-- ─── Anket oluşturma ─────────────────────────────────────────────────────────

create or replace function public.admin_create_poll(
  p_region_id text,
  p_question text,
  p_options text[],
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll_id uuid;
  v_opt text;
  v_idx int := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_question is null or char_length(trim(p_question)) < 3 then
    raise exception 'invalid question';
  end if;

  if p_options is null or array_length(p_options, 1) < 2 then
    raise exception 'at least two options required';
  end if;

  insert into public.polls (author_id, region_id, question, ends_at)
  values (auth.uid(), p_region_id, trim(p_question), p_ends_at)
  returning id into v_poll_id;

  foreach v_opt in array p_options loop
    v_idx := v_idx + 1;
    insert into public.poll_options (poll_id, label, sort_order)
    values (v_poll_id, trim(v_opt), v_idx);
  end loop;

  return v_poll_id;
end;
$$;

-- ─── Uygulama tanıtım slaytları ──────────────────────────────────────────────

create table if not exists public.app_intro_slides (
  id text primary key,
  icon text not null,
  accent text not null default '#E85D5D',
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.app_intro_slides enable row level security;

drop policy if exists app_intro_slides_public_read on public.app_intro_slides;
create policy app_intro_slides_public_read on public.app_intro_slides
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists app_intro_slides_admin_all on public.app_intro_slides;
create policy app_intro_slides_admin_all on public.app_intro_slides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_intro_slides (id, icon, accent, title, subtitle, description, sort_order)
values
  ('welcome', 'water', '#E85D5D', 'Vora''ya Hoş Geldin', 'Karadeniz''in canlı dijital ağı',
   'Vora; şehrin nabzını tutan, komşularınla bağ kuran ve günlük hayatını kolaylaştıran yerel bir süper uygulamadır.', 1),
  ('feed', 'newspaper', '#1E88E5', 'Akış & Topluluk', 'Şehrini canlı takip et',
   'Güncel haberler, yerel gönderiler, topluluklar ve kanallarla çevrende neler olup bittiğini anında gör.', 2),
  ('map', 'map', '#00897B', 'Harita & Yakınınız', 'Konum tabanlı bilgi',
   'Canlı haritada trafik, acil noktalar ve yakınındaki olayları tek ekranda keşfet.', 3),
  ('centers', 'grid', '#7B1FA2', 'Merkezler', 'Her ihtiyaca özel modüller',
   'Etkinlik, iş ilanı, kayıp eşya, yardım ve daha fazlası — 8 merkez tek uygulamada.', 4),
  ('messaging', 'chatbubbles', '#1565C0', 'Mesajlaşma & Arama', 'Bağlantıda kal',
   'Özel mesajlar, grup sohbetleri, sesli ve görüntülü aramalarla arkadaşların ve komşularınla iletişim kur.', 5),
  ('reels', 'play-circle', '#F57C00', 'Reels & Keşfet', 'Video ve keşif deneyimi',
   'Kısa videolar izle, yaratıcı içerikler paylaş ve Keşfet sekmesinde yeni insanlar ile yerleri bul.', 6),
  ('start', 'rocket', '#E85D5D', 'Hazırsın!', 'Karadeniz seni bekliyor',
   'Hesap oluştur veya misafir olarak devam et — Vora''yı keşfetmeye hemen başla.', 7)
on conflict (id) do nothing;

create or replace function public.admin_list_app_intro_slides()
returns setof public.app_intro_slides
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select * from public.app_intro_slides
  order by sort_order asc, id asc;
end;
$$;

create or replace function public.admin_upsert_app_intro_slide(
  p_id text,
  p_icon text,
  p_accent text,
  p_title text,
  p_subtitle text,
  p_description text,
  p_sort_order int,
  p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  insert into public.app_intro_slides (
    id, icon, accent, title, subtitle, description, sort_order, is_active, updated_by, updated_at
  )
  values (
    p_id, p_icon, p_accent, p_title, p_subtitle, p_description, p_sort_order, p_is_active, auth.uid(), now()
  )
  on conflict (id) do update set
    icon = excluded.icon,
    accent = excluded.accent,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_by = auth.uid(),
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_app_intro_slide(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.app_intro_slides where id = p_id;

  if not found then
    raise exception 'slide not found';
  end if;
end;
$$;

create or replace function public.fetch_app_intro_slides()
returns setof public.app_intro_slides
language sql
stable
security definer
set search_path = public
as $$
  select * from public.app_intro_slides
  where is_active = true
  order by sort_order asc, id asc;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

grant execute on function public.admin_list_account_link_requests to authenticated;
grant execute on function public.admin_list_linked_accounts to authenticated;
grant execute on function public.admin_cancel_account_link_request to authenticated;
grant execute on function public.admin_force_unlink_accounts to authenticated;
grant execute on function public.admin_list_proximity_presence to authenticated;
grant execute on function public.admin_list_proximity_interactions to authenticated;
grant execute on function public.admin_clear_proximity_presence to authenticated;
grant execute on function public.admin_list_explorer_presence to authenticated;
grant execute on function public.admin_hide_explorer_presence to authenticated;
grant execute on function public.admin_friend_invite_stats to authenticated;
grant execute on function public.admin_list_friend_invite_redemptions to authenticated;
grant execute on function public.admin_list_business_shops to authenticated;
grant execute on function public.admin_list_business_shop_boosts to authenticated;
grant execute on function public.admin_set_business_shop_published to authenticated;
grant execute on function public.admin_cancel_business_shop_boost to authenticated;
grant execute on function public.admin_list_hotel_listings to authenticated;
grant execute on function public.admin_moderate_hotel_listing to authenticated;
grant execute on function public.admin_list_hotel_reviews to authenticated;
grant execute on function public.admin_delete_hotel_review to authenticated;
grant execute on function public.admin_list_badge_holders to authenticated;
grant execute on function public.admin_create_poll to authenticated;
grant execute on function public.admin_list_app_intro_slides to authenticated;
grant execute on function public.admin_upsert_app_intro_slide to authenticated;
grant execute on function public.admin_delete_app_intro_slide to authenticated;
grant execute on function public.fetch_app_intro_slides to authenticated;
grant select on public.app_intro_slides to anon, authenticated;
