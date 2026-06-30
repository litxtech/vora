-- İzdivaç özel profil katmanı (ana profilde görünmez)

create or replace function public.izdivac_has_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user_id, auth.uid())
      and p.izdivac_access_granted = true
      and p.account_status = 'active'
  );
$$;

create table if not exists public.izdivac_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  looking_for text,
  about_me text,
  preferences jsonb not null default '{}'::jsonb,
  show_on_wall boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.izdivac_profiles enable row level security;

create policy izdivac_profiles_read on public.izdivac_profiles
  for select to authenticated
  using (public.izdivac_has_access());

create policy izdivac_profiles_self_write on public.izdivac_profiles
  for all to authenticated
  using (user_id = auth.uid() and public.izdivac_has_access())
  with check (user_id = auth.uid() and public.izdivac_has_access());

create or replace function public.izdivac_upsert_profile(
  p_headline text default null,
  p_looking_for text default null,
  p_about_me text default null,
  p_show_on_wall boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.izdivac_has_access() then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  insert into public.izdivac_profiles (user_id, headline, looking_for, about_me, show_on_wall, updated_at)
  values (
    auth.uid(),
    nullif(trim(coalesce(p_headline, '')), ''),
    nullif(trim(coalesce(p_looking_for, '')), ''),
    nullif(trim(coalesce(p_about_me, '')), ''),
    coalesce(p_show_on_wall, true),
    now()
  )
  on conflict (user_id) do update
    set headline = excluded.headline,
        looking_for = excluded.looking_for,
        about_me = excluded.about_me,
        show_on_wall = excluded.show_on_wall,
        updated_at = now();
end;
$$;

create or replace function public.izdivac_get_profile(p_user_id uuid default auth.uid())
returns table (
  user_id uuid,
  headline text,
  looking_for text,
  about_me text,
  show_on_wall boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select ip.user_id, ip.headline, ip.looking_for, ip.about_me, ip.show_on_wall
  from public.izdivac_profiles ip
  where ip.user_id = coalesce(p_user_id, auth.uid())
    and public.izdivac_has_access();
$$;

grant execute on function public.izdivac_has_access(uuid) to authenticated;
grant execute on function public.izdivac_upsert_profile(text, text, text, boolean) to authenticated;
grant execute on function public.izdivac_get_profile(uuid) to authenticated;
