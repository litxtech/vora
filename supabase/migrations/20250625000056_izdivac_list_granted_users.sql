-- İzdivaç listesi: yetki verilen tüm üyeler (yalnızca lobide olanlar değil)

drop function if exists public.izdivac_list_participants();

create function public.izdivac_list_participants()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  age_years integer,
  gender public.gender_type,
  is_online boolean,
  in_lobby boolean
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
    ) as in_lobby
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
