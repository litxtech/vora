-- İzdivaç merkezi: admin onaylı kullanıcılar, cinsiyet panelli lobi, mesaj & arama

alter table public.profiles
  add column if not exists izdivac_access_granted boolean not null default false;

create table if not exists public.izdivac_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists izdivac_presence_active_idx
  on public.izdivac_presence (updated_at desc);

alter table public.izdivac_presence enable row level security;

create policy izdivac_presence_read
  on public.izdivac_presence for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.izdivac_access_granted = true
        and me.account_status = 'active'
    )
  );

create policy izdivac_presence_self_write
  on public.izdivac_presence for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.izdivac_access_granted = true
        and me.account_status = 'active'
    )
  );

create or replace function public.izdivac_join_lobby()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Giriş gerekli';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_me
      and p.izdivac_access_granted = true
      and p.account_status = 'active'
      and p.gender in ('female', 'male')
      and p.birth_date is not null
      and p.birth_date <= (current_date - interval '18 years')::date
  ) then
    raise exception 'İzdivaç erişiminiz yok veya profiliniz tamamlanmamış';
  end if;

  insert into public.izdivac_presence (user_id, joined_at, updated_at)
  values (v_me, now(), now())
  on conflict (user_id) do update
    set updated_at = now();
end;
$$;

create or replace function public.izdivac_leave_lobby()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  delete from public.izdivac_presence where user_id = auth.uid();
end;
$$;

create or replace function public.izdivac_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.izdivac_presence
  set updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.izdivac_list_participants()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  age_years integer,
  gender public.gender_type,
  is_online boolean
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
    extract(year from age(p.birth_date))::integer as age_years,
    p.gender,
    coalesce(p.is_online, false) as is_online
  from public.izdivac_presence ip
  inner join public.profiles p on p.id = ip.user_id
  where ip.updated_at > now() - interval '5 minutes'
    and p.account_status = 'active'
    and p.izdivac_access_granted = true
    and p.gender in ('female', 'male')
    and p.birth_date is not null
    and p.birth_date <= (current_date - interval '18 years')::date
    and p.id is distinct from v_me
    and not exists (
      select 1 from public.user_blocks ub
      where (ub.blocker_id = v_me and ub.blocked_id = p.id)
         or (ub.blocker_id = p.id and ub.blocked_id = v_me)
    )
  order by ip.updated_at desc;
end;
$$;

create or replace function public.admin_grant_izdivac_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  update public.profiles
  set izdivac_access_granted = true, updated_at = now()
  where id = p_user_id;

  perform public.notify_profile_user(
    p_user_id,
    'system',
    'İzdivaç erişimi',
    'İzdivaç merkezine erişiminiz açıldı. Merkezler sekmesinden giriş yapabilirsiniz.',
    jsonb_build_object('centerId', 'izdivac-center')
  );
end;
$$;

create or replace function public.admin_revoke_izdivac_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  delete from public.izdivac_presence where user_id = p_user_id;

  update public.profiles
  set izdivac_access_granted = false, updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.admin_list_izdivac_users(
  p_search text default null,
  p_limit int default 50
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  gender public.gender_type,
  birth_date date,
  izdivac_access_granted boolean,
  is_online boolean,
  in_lobby boolean,
  granted_at timestamptz
)
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
  select
    p.id,
    p.username,
    p.full_name,
    p.gender,
    p.birth_date,
    p.izdivac_access_granted,
    coalesce(p.is_online, false),
    exists (
      select 1 from public.izdivac_presence ip
      where ip.user_id = p.id and ip.updated_at > now() - interval '5 minutes'
    ),
    p.updated_at
  from public.profiles p
  where p.account_status = 'active'
    and (
      p.izdivac_access_granted = true
      or p_search is null
      or trim(p_search) = ''
      or p.username ilike '%' || trim(p_search) || '%'
      or coalesce(p.full_name, '') ilike '%' || trim(p_search) || '%'
    )
  order by p.izdivac_access_granted desc, p.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

grant execute on function public.izdivac_join_lobby() to authenticated;
grant execute on function public.izdivac_leave_lobby() to authenticated;
grant execute on function public.izdivac_heartbeat() to authenticated;
grant execute on function public.izdivac_list_participants() to authenticated;
grant execute on function public.admin_grant_izdivac_access(uuid) to authenticated;
grant execute on function public.admin_revoke_izdivac_access(uuid) to authenticated;
grant execute on function public.admin_list_izdivac_users(text, int) to authenticated;

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('izdivac-center', 'İzdivaç', 'centers', true)
on conflict (feature_id) do update
  set label = excluded.label,
      feature_group = excluded.feature_group;
