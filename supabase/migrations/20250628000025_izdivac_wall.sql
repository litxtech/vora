-- İzdivaç duvarı: paylaşımlar, yorumlar, beğeniler, katılımlar (feed'den bağımsız)

alter type public.notification_event_type add value if not exists 'izdivac_post_comment';
alter type public.notification_event_type add value if not exists 'izdivac_post_join';

create type public.izdivac_post_kind as enum ('share', 'invite', 'media');

create table if not exists public.izdivac_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.izdivac_post_kind not null default 'share',
  body text not null default '',
  media_urls text[] not null default '{}',
  invite_meta jsonb,
  space_id uuid,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  join_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint izdivac_posts_body_or_media check (
    length(trim(body)) > 0 or cardinality(media_urls) > 0
  )
);

create index if not exists izdivac_posts_created_idx on public.izdivac_posts (created_at desc);
create index if not exists izdivac_posts_author_idx on public.izdivac_posts (author_id, created_at desc);

create table if not exists public.izdivac_post_likes (
  post_id uuid not null references public.izdivac_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.izdivac_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.izdivac_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint izdivac_post_comments_body_nonempty check (length(trim(body)) > 0)
);

create index if not exists izdivac_post_comments_post_idx
  on public.izdivac_post_comments (post_id, created_at asc);

create table if not exists public.izdivac_post_joins (
  post_id uuid not null references public.izdivac_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.izdivac_posts enable row level security;
alter table public.izdivac_post_likes enable row level security;
alter table public.izdivac_post_comments enable row level security;
alter table public.izdivac_post_joins enable row level security;

create policy izdivac_posts_read on public.izdivac_posts
  for select to authenticated using (public.izdivac_has_access());

create policy izdivac_post_likes_read on public.izdivac_post_likes
  for select to authenticated using (public.izdivac_has_access());

create policy izdivac_post_comments_read on public.izdivac_post_comments
  for select to authenticated using (public.izdivac_has_access());

create policy izdivac_post_joins_read on public.izdivac_post_joins
  for select to authenticated using (public.izdivac_has_access());

-- ─── Duvar RPC'leri ───────────────────────────────────────────────────────────

create or replace function public.izdivac_create_post(
  p_body text,
  p_kind public.izdivac_post_kind default 'share',
  p_media_urls text[] default array[]::text[],
  p_invite_meta jsonb default null,
  p_open_space boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_post_id uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  if v_body = '' and coalesce(cardinality(p_media_urls), 0) = 0 then
    raise exception 'Paylaşım metni veya medya gerekli';
  end if;

  insert into public.izdivac_posts (author_id, kind, body, media_urls, invite_meta)
  values (
    v_me,
    coalesce(p_kind, 'share'),
    v_body,
    coalesce(p_media_urls, array[]::text[]),
    p_invite_meta
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

create or replace function public.izdivac_list_posts(p_limit int default 40, p_cursor timestamptz default null)
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
  created_at timestamptz
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
    p.created_at
  from public.izdivac_posts p
  inner join public.profiles pr on pr.id = p.author_id
  where pr.account_status = 'active'
    and pr.izdivac_access_granted = true
    and p.author_id is distinct from v_me
      or p.author_id = v_me
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

create or replace function public.izdivac_toggle_post_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_liked boolean;
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  if exists (
    select 1 from public.izdivac_post_likes
    where post_id = p_post_id and user_id = v_me
  ) then
    delete from public.izdivac_post_likes where post_id = p_post_id and user_id = v_me;
    update public.izdivac_posts set like_count = greatest(0, like_count - 1) where id = p_post_id;
    return false;
  end if;

  insert into public.izdivac_post_likes (post_id, user_id) values (p_post_id, v_me);
  update public.izdivac_posts set like_count = like_count + 1 where id = p_post_id;
  return true;
end;
$$;

create or replace function public.izdivac_add_post_comment(p_post_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_comment_id uuid;
  v_author_id uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;
  if v_body = '' then
    raise exception 'Yorum boş olamaz';
  end if;

  select author_id into v_author_id from public.izdivac_posts where id = p_post_id;
  if v_author_id is null then
    raise exception 'Paylaşım bulunamadı';
  end if;

  insert into public.izdivac_post_comments (post_id, author_id, body)
  values (p_post_id, v_me, v_body)
  returning id into v_comment_id;

  update public.izdivac_posts set comment_count = comment_count + 1 where id = p_post_id;

  if v_author_id is distinct from v_me then
    perform public.notify_profile_user(
      v_author_id,
      'izdivac_post_comment',
      'İzdivaç duvarında yorum',
      left(v_body, 120),
      jsonb_build_object(
        'kind', 'izdivac_post_comment',
        'post_id', p_post_id,
        'comment_id', v_comment_id,
        'actor_id', v_me,
        'deep_link', '/izdivac-center?tab=wall',
        'action_hint', 'Duvara git'
      )
    );
  end if;

  return v_comment_id;
end;
$$;

create or replace function public.izdivac_list_post_comments(p_post_id uuid)
returns table (
  comment_id uuid,
  author_id uuid,
  author_first_name text,
  author_avatar_url text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.author_id,
    coalesce(nullif(trim(p.first_name), ''), split_part(coalesce(p.full_name, ''), ' ', 1)),
    p.avatar_url,
    c.body,
    c.created_at
  from public.izdivac_post_comments c
  inner join public.profiles p on p.id = c.author_id
  where c.post_id = p_post_id
    and public.izdivac_has_access()
  order by c.created_at asc;
$$;

create or replace function public.izdivac_join_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_author_id uuid;
  v_space_id uuid;
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  select author_id, space_id into v_author_id, v_space_id
  from public.izdivac_posts where id = p_post_id;

  if v_author_id is null then
    raise exception 'Paylaşım bulunamadı';
  end if;

  insert into public.izdivac_post_joins (post_id, user_id)
  values (p_post_id, v_me)
  on conflict do nothing;

  update public.izdivac_posts
  set join_count = (
    select count(*)::integer from public.izdivac_post_joins where post_id = p_post_id
  )
  where id = p_post_id;

  if v_author_id is distinct from v_me then
    perform public.notify_profile_user(
      v_author_id,
      'izdivac_post_join',
      'İzdivaç davetine katılım',
      'Paylaşımınıza katılmak istiyor.',
      jsonb_build_object(
        'kind', 'izdivac_post_join',
        'post_id', p_post_id,
        'actor_id', v_me,
        'deep_link', '/izdivac-center?tab=wall',
        'action_hint', 'Duvara git'
      )
    );
  end if;

  return v_space_id;
end;
$$;

grant execute on function public.izdivac_create_post(text, public.izdivac_post_kind, text[], jsonb, boolean) to authenticated;
grant execute on function public.izdivac_list_posts(int, timestamptz) to authenticated;
grant execute on function public.izdivac_toggle_post_like(uuid) to authenticated;
grant execute on function public.izdivac_add_post_comment(uuid, text) to authenticated;
grant execute on function public.izdivac_list_post_comments(uuid) to authenticated;
grant execute on function public.izdivac_join_post(uuid) to authenticated;
