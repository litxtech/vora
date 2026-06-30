-- İzdivaç görüşme alanları (grup sohbet + metadata)

create type public.izdivac_conversation_link_type as enum ('direct', 'space');
create type public.izdivac_conversation_initiated_from as enum ('member_card', 'wall', 'invite', 'space');

create table if not exists public.izdivac_conversation_links (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  link_type public.izdivac_conversation_link_type not null,
  space_id uuid,
  initiated_from public.izdivac_conversation_initiated_from not null default 'member_card',
  created_at timestamptz not null default now()
);

alter table public.izdivac_conversation_links enable row level security;

create policy izdivac_conversation_links_read on public.izdivac_conversation_links
  for select to authenticated using (public.izdivac_has_access());

create type public.izdivac_space_type as enum ('open', 'invite_only', 'plan');
create type public.izdivac_space_audience as enum ('all_members', 'opposite_gender', 'invited_only');
create type public.izdivac_space_status as enum ('active', 'archived');

create table if not exists public.izdivac_spaces (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  space_type public.izdivac_space_type not null default 'open',
  audience public.izdivac_space_audience not null default 'all_members',
  linked_post_id uuid references public.izdivac_posts (id) on delete set null,
  member_count integer not null default 1,
  status public.izdivac_space_status not null default 'active',
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

alter table public.izdivac_posts
  add constraint izdivac_posts_space_id_fkey
  foreign key (space_id) references public.izdivac_spaces (id) on delete set null;

create index if not exists izdivac_spaces_active_idx
  on public.izdivac_spaces (status, last_activity_at desc);

create table if not exists public.izdivac_space_members (
  space_id uuid not null references public.izdivac_spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('founder', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.izdivac_spaces enable row level security;
alter table public.izdivac_space_members enable row level security;

create policy izdivac_spaces_read on public.izdivac_spaces
  for select to authenticated using (public.izdivac_has_access());

create policy izdivac_space_members_read on public.izdivac_space_members
  for select to authenticated using (public.izdivac_has_access());

-- ─── Yardımcı: karşı cins kontrolü ───────────────────────────────────────────

create or replace function public.izdivac_passes_audience(
  p_audience public.izdivac_space_audience,
  p_viewer_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer_gender public.gender_type;
  v_target_gender public.gender_type;
begin
  if p_audience = 'all_members' then
    return true;
  end if;

  if p_audience = 'invited_only' then
    return p_viewer_id = p_target_id;
  end if;

  select gender into v_viewer_gender from public.profiles where id = p_viewer_id;
  select gender into v_target_gender from public.profiles where id = p_target_id;

  if v_viewer_gender is null or v_target_gender is null then
    return false;
  end if;

  return v_viewer_gender is distinct from v_target_gender;
end;
$$;

-- ─── Plan odası (duvar davetinden) ───────────────────────────────────────────

create or replace function public.izdivac_create_plan_space_from_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_post public.izdivac_posts%rowtype;
  v_title text;
  v_conversation_id uuid;
  v_space_id uuid;
begin
  select * into v_post from public.izdivac_posts where id = p_post_id for update;
  if v_post.id is null then
    raise exception 'Paylaşım bulunamadı';
  end if;
  if v_post.author_id is distinct from v_me then
    raise exception 'Yalnızca kendi paylaşımınız için oda açabilirsiniz';
  end if;
  if v_post.space_id is not null then
    return v_post.space_id;
  end if;

  v_title := left(coalesce(nullif(trim(v_post.body), ''), 'Plan odası'), 60);

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_me)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_me, 'founder');

  insert into public.izdivac_spaces (
    conversation_id, created_by, title, description, space_type, audience, linked_post_id
  )
  values (
    v_conversation_id, v_me, v_title, v_post.body, 'plan', 'all_members', p_post_id
  )
  returning id into v_space_id;

  insert into public.izdivac_space_members (space_id, user_id, role)
  values (v_space_id, v_me, 'founder');

  update public.izdivac_posts set space_id = v_space_id where id = p_post_id;

  insert into public.izdivac_conversation_links (conversation_id, link_type, space_id, initiated_from)
  values (v_conversation_id, 'space', v_space_id, 'wall')
  on conflict do nothing;

  return v_space_id;
end;
$$;

-- ─── Alan oluştur ─────────────────────────────────────────────────────────────

create or replace function public.izdivac_create_space(
  p_title text,
  p_description text default null,
  p_space_type public.izdivac_space_type default 'open',
  p_audience public.izdivac_space_audience default 'all_members'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_title text := left(trim(coalesce(p_title, '')), 80);
  v_conversation_id uuid;
  v_space_id uuid;
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;
  if v_title = '' then
    raise exception 'Alan adı gerekli';
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_me)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_me, 'founder');

  insert into public.izdivac_spaces (
    conversation_id, created_by, title, description, space_type, audience
  )
  values (
    v_conversation_id, v_me, v_title,
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_space_type, 'open'),
    coalesce(p_audience, 'all_members')
  )
  returning id into v_space_id;

  insert into public.izdivac_space_members (space_id, user_id, role)
  values (v_space_id, v_me, 'founder');

  insert into public.izdivac_conversation_links (conversation_id, link_type, space_id, initiated_from)
  values (v_conversation_id, 'space', v_space_id, 'space')
  on conflict do nothing;

  return v_space_id;
end;
$$;

create or replace function public.izdivac_join_space(p_space_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_space public.izdivac_spaces%rowtype;
  v_conversation_id uuid;
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  select * into v_space from public.izdivac_spaces where id = p_space_id and status = 'active';
  if v_space.id is null then
    raise exception 'Alan bulunamadı';
  end if;

  if v_space.space_type = 'invite_only' then
    raise exception 'Bu alana yalnızca davet ile girilebilir';
  end if;

  if not public.izdivac_passes_audience(v_space.audience, v_me, v_space.created_by) then
    raise exception 'Bu alana erişim yetkiniz yok';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_space.conversation_id, v_me, 'member')
  on conflict do nothing;

  insert into public.izdivac_space_members (space_id, user_id, role)
  values (p_space_id, v_me, 'member')
  on conflict do nothing;

  update public.izdivac_spaces
  set member_count = (
    select count(*)::integer from public.izdivac_space_members where space_id = p_space_id
  ),
  last_activity_at = now()
  where id = p_space_id;

  insert into public.izdivac_conversation_links (conversation_id, link_type, space_id, initiated_from)
  values (v_space.conversation_id, 'space', p_space_id, 'space')
  on conflict do nothing;

  return v_space.conversation_id;
end;
$$;

create or replace function public.izdivac_list_spaces(p_limit int default 50)
returns table (
  space_id uuid,
  conversation_id uuid,
  title text,
  description text,
  space_type public.izdivac_space_type,
  audience public.izdivac_space_audience,
  member_count integer,
  created_by uuid,
  creator_first_name text,
  creator_avatar_url text,
  linked_post_id uuid,
  is_member boolean,
  last_activity_at timestamptz
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
    s.id,
    s.conversation_id,
    s.title,
    s.description,
    s.space_type,
    s.audience,
    s.member_count,
    s.created_by,
    coalesce(nullif(trim(p.first_name), ''), split_part(coalesce(p.full_name, ''), ' ', 1)),
    p.avatar_url,
    s.linked_post_id,
    exists (select 1 from public.izdivac_space_members m where m.space_id = s.id and m.user_id = v_me),
    s.last_activity_at
  from public.izdivac_spaces s
  inner join public.profiles p on p.id = s.created_by
  where s.status = 'active'
    and (
      s.space_type = 'open'
      or exists (select 1 from public.izdivac_space_members m where m.space_id = s.id and m.user_id = v_me)
    )
    and public.izdivac_passes_audience(s.audience, v_me, s.created_by)
  order by s.last_activity_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create or replace function public.izdivac_archive_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  update public.izdivac_spaces
  set status = 'archived', last_activity_at = now()
  where id = p_space_id and created_by = v_me;

  if not found then
    raise exception 'Alan kapatılamadı';
  end if;
end;
$$;

-- Duvar create_post: plan odası açma
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

  if coalesce(p_open_space, false) and coalesce(p_kind, 'share') = 'invite' then
    perform public.izdivac_create_plan_space_from_post(v_post_id);
  end if;

  return v_post_id;
end;
$$;

-- Duvar list_posts düzeltmesi
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

grant execute on function public.izdivac_create_plan_space_from_post(uuid) to authenticated;
grant execute on function public.izdivac_create_space(text, text, public.izdivac_space_type, public.izdivac_space_audience) to authenticated;
grant execute on function public.izdivac_join_space(uuid) to authenticated;
grant execute on function public.izdivac_list_spaces(int) to authenticated;
grant execute on function public.izdivac_archive_space(uuid) to authenticated;

alter table public.izdivac_conversation_links
  add constraint izdivac_conversation_links_space_id_fkey
  foreign key (space_id) references public.izdivac_spaces (id) on delete cascade;

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

  if v_space_id is not null then
    perform public.izdivac_join_space(v_space_id);
  end if;

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
