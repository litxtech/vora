-- İzdivaç özel tikleri (jigolo, tilki, finansman) yalnızca İzdivaç erişimi olan
-- aktif kullanıcılarda görünür. Böylece kişi İzdivaç'tan çıkarılınca tik otomatik
-- kalkar, tekrar erişim verilince tik satırı korunduğu için geri gelir.

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
  inner join public.profiles p on p.id = b.user_id
  where b.user_id = p_user_id
    and p.izdivac_access_granted = true
    and p.account_status = 'active'
    and (
      p_context = 'izdivac'
      or (p_context = 'app' and b.visibility in ('app', 'both'))
    )
  order by b.granted_at;
$$;

grant execute on function public.izdivac_user_special_badges(uuid, text) to authenticated;
