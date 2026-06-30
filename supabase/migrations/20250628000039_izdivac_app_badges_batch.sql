-- Feed / reels / reklam akışında yazarların İzdivaç özel tiklerini toplu getir.
-- Yalnızca uygulamada görünür (app/both) ve İzdivaç erişimi açık + aktif kullanıcılar.

create or replace function public.izdivac_app_special_badges_batch(p_user_ids uuid[])
returns table (user_id uuid, badge_type text)
language sql
stable
security definer
set search_path = public
as $$
  select b.user_id, b.badge_type
  from public.izdivac_special_badges b
  inner join public.profiles p on p.id = b.user_id
  where b.user_id = any(p_user_ids)
    and b.visibility in ('app', 'both')
    and p.izdivac_access_granted = true
    and p.account_status = 'active'
  order by b.granted_at;
$$;

grant execute on function public.izdivac_app_special_badges_batch(uuid[]) to authenticated;
