-- İzdivaç özel tikleri: jigolo, tilki, finansman
-- Öncü rozeti gibi yalnızca admin tarafından verilir.
-- jigolo gibi tikler için görünürlük: yalnızca İzdivaç / tüm uygulama / ikisi.

create table if not exists public.izdivac_special_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_type text not null check (badge_type in ('jigolo', 'tilki', 'finansman')),
  visibility text not null default 'izdivac' check (visibility in ('izdivac', 'app', 'both')),
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, badge_type)
);

create index if not exists izdivac_special_badges_user_idx
  on public.izdivac_special_badges (user_id);

alter table public.izdivac_special_badges enable row level security;

drop policy if exists izdivac_special_badges_read on public.izdivac_special_badges;
create policy izdivac_special_badges_read on public.izdivac_special_badges
  for select to authenticated using (true);

-- ─── Admin: tik ver / kaldır ────────────────────────────────────────────────

create or replace function public.admin_grant_izdivac_badge(
  p_user_id uuid,
  p_badge_type text,
  p_visibility text default 'izdivac'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  if p_badge_type not in ('jigolo', 'tilki', 'finansman') then
    raise exception 'Geçersiz tik türü';
  end if;

  if coalesce(p_visibility, 'izdivac') not in ('izdivac', 'app', 'both') then
    raise exception 'Geçersiz görünürlük';
  end if;

  insert into public.izdivac_special_badges (user_id, badge_type, visibility, granted_by, granted_at)
  values (p_user_id, p_badge_type, coalesce(p_visibility, 'izdivac'), auth.uid(), now())
  on conflict (user_id, badge_type)
  do update set visibility = excluded.visibility, granted_by = excluded.granted_by, granted_at = now();

  v_label := case p_badge_type
    when 'jigolo' then 'Jigolo'
    when 'tilki' then 'Tilki'
    when 'finansman' then 'Finansman'
    else p_badge_type
  end;

  perform public.notify_profile_user(
    p_user_id,
    'badge_earned',
    v_label,
    'Size özel bir İzdivaç tiki verildi: ' || v_label,
    jsonb_build_object('badgeType', p_badge_type, 'scope', 'izdivac')
  );
end;
$$;

create or replace function public.admin_revoke_izdivac_badge(
  p_user_id uuid,
  p_badge_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  delete from public.izdivac_special_badges
  where user_id = p_user_id and badge_type = p_badge_type;
end;
$$;

grant execute on function public.admin_grant_izdivac_badge(uuid, text, text) to authenticated;
grant execute on function public.admin_revoke_izdivac_badge(uuid, text) to authenticated;

-- ─── Tik okuma (uygulama / izdivaç bağlamı) ─────────────────────────────────

create or replace function public.izdivac_user_special_badges(
  p_user_id uuid,
  p_context text default 'izdivac'
)
returns table (badge_type text, visibility text)
language sql
stable
security definer
set search_path = public
as $$
  select b.badge_type, b.visibility
  from public.izdivac_special_badges b
  where b.user_id = p_user_id
    and (
      p_context = 'izdivac'
      or (p_context = 'app' and b.visibility in ('app', 'both'))
    )
  order by b.granted_at;
$$;

grant execute on function public.izdivac_user_special_badges(uuid, text) to authenticated;

create or replace function public.admin_list_izdivac_badges(p_user_id uuid)
returns table (badge_type text, visibility text, granted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.badge_type, b.visibility, b.granted_at
  from public.izdivac_special_badges b
  where b.user_id = p_user_id
  order by b.granted_at;
$$;

grant execute on function public.admin_list_izdivac_badges(uuid) to authenticated;

-- ─── Liste fonksiyonlarına tik kolonu ekle ──────────────────────────────────

drop function if exists public.izdivac_list_participants();

create function public.izdivac_list_participants()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  age_years integer,
  gender public.gender_type,
  is_online boolean,
  in_lobby boolean,
  avatar_url text,
  cover_url text,
  special_badges text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_me and p.izdivac_access_granted = true and p.account_status = 'active'
  ) then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(nullif(trim(p.first_name), ''), split_part(coalesce(p.full_name, ''), ' ', 1)) as first_name,
    coalesce(nullif(trim(p.last_name), ''), nullif(trim(substring(coalesce(p.full_name, '') from position(' ' in coalesce(p.full_name, '')) + 1)), '')) as last_name,
    case
      when p.birth_date is not null then extract(year from age(p.birth_date))::integer
      else null
    end as age_years,
    p.gender,
    coalesce(p.is_online, false) as is_online,
    exists (
      select 1
      from public.izdivac_presence ip
      where ip.user_id = p.id
        and ip.updated_at > now() - interval '5 minutes'
    ) as in_lobby,
    p.avatar_url,
    p.cover_url,
    coalesce(
      array(
        select b.badge_type from public.izdivac_special_badges b
        where b.user_id = p.id order by b.granted_at
      ),
      array[]::text[]
    ) as special_badges
  from public.profiles p
  where p.izdivac_access_granted = true
    and p.account_status = 'active'
    and p.gender in ('female', 'male')
    and p.id is distinct from v_me
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = v_me and ub.blocked_id = p.id)
         or (ub.blocker_id = p.id and ub.blocked_id = v_me)
    )
  order by
    exists (
      select 1
      from public.izdivac_presence ip
      where ip.user_id = p.id
        and ip.updated_at > now() - interval '5 minutes'
    ) desc,
    coalesce(p.is_online, false) desc,
    coalesce(p.full_name, p.username) asc;
end;
$$;

grant execute on function public.izdivac_list_participants() to authenticated;

drop function if exists public.izdivac_list_posts(int, timestamptz);

create function public.izdivac_list_posts(p_limit int default 40, p_cursor timestamptz default null)
returns table (
  post_id uuid,
  author_id uuid,
  author_first_name text,
  author_last_name text,
  author_avatar_url text,
  kind public.izdivac_post_kind,
  body text,
  media_urls text[],
  invite_meta jsonb,
  space_id uuid,
  like_count integer,
  comment_count integer,
  join_count integer,
  liked_by_me boolean,
  joined_by_me boolean,
  created_at timestamptz,
  author_special_badges text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if not public.izdivac_has_access(v_me) then
    return;
  end if;

  return query
  select
    p.id,
    p.author_id,
    coalesce(nullif(trim(pr.first_name), ''), split_part(coalesce(pr.full_name, ''), ' ', 1)),
    coalesce(nullif(trim(pr.last_name), ''), nullif(trim(substring(coalesce(pr.full_name, '') from position(' ' in coalesce(pr.full_name, '')) + 1)), '')),
    pr.avatar_url,
    p.kind,
    p.body,
    p.media_urls,
    p.invite_meta,
    p.space_id,
    p.like_count,
    p.comment_count,
    p.join_count,
    exists (select 1 from public.izdivac_post_likes l where l.post_id = p.id and l.user_id = v_me),
    exists (select 1 from public.izdivac_post_joins j where j.post_id = p.id and j.user_id = v_me),
    p.created_at,
    coalesce(
      array(
        select b.badge_type from public.izdivac_special_badges b
        where b.user_id = p.author_id order by b.granted_at
      ),
      array[]::text[]
    )
  from public.izdivac_posts p
  inner join public.profiles pr on pr.id = p.author_id
  where pr.account_status = 'active'
    and pr.izdivac_access_granted = true
    and (p_cursor is null or p.created_at < p_cursor)
    and not exists (
      select 1 from public.user_blocks ub
      where (ub.blocker_id = v_me and ub.blocked_id = p.author_id)
         or (ub.blocker_id = p.author_id and ub.blocked_id = v_me)
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

grant execute on function public.izdivac_list_posts(int, timestamptz) to authenticated;
