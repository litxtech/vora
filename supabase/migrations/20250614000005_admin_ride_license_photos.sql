-- Admin ehliyet kuyruğuna belge yollarını ekle
-- PostgreSQL dönüş tipi değişince CREATE OR REPLACE yeterli değil; önce drop gerekir.

drop function if exists public.admin_list_ride_license_verifications(int);

create function public.admin_list_ride_license_verifications(p_limit int default 30)
returns table (
  id uuid,
  user_id uuid,
  status public.ride_license_verification_status,
  created_at timestamptz,
  username text,
  full_name text,
  license_front_path text,
  license_back_path text,
  selfie_path text
)
language sql stable security definer set search_path = public as $$
  select
    v.id,
    v.user_id,
    v.status,
    v.created_at,
    p.username,
    p.full_name,
    v.license_front_path,
    v.license_back_path,
    v.selfie_path
  from public.ride_license_verifications v
  join public.profiles p on p.id = v.user_id
  where public.is_moderator() and v.status = 'pending'
  order by v.created_at asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.admin_list_ride_license_verifications(int) to authenticated;
