-- Admin reklam onay kuyruğu: tüm reklam alanları
-- Dönüş tipi değiştiği için önce eski imza kaldırılır (42P13).

drop function if exists public.admin_list_business_ads(public.ad_status, int);

create function public.admin_list_business_ads(
  p_status public.ad_status default 'pending',
  p_limit int default 50
)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  title text,
  description text,
  image_url text,
  cta_label text,
  destination_url text,
  ad_type public.ad_type,
  status public.ad_status,
  billing_mode text,
  budget_cents int,
  spent_cents int,
  cpc_cents int,
  target_region_id text,
  target_region_ids text[],
  target_district text,
  target_age_min smallint,
  target_age_max smallint,
  target_interests text[],
  impressions int,
  clicks int,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz,
  owner_id uuid,
  owner_username text,
  owner_full_name text,
  owner_avatar_url text
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
    ba.id,
    ba.business_id,
    b.name as business_name,
    ba.title,
    ba.description,
    ba.image_url,
    ba.cta_label,
    ba.destination_url,
    ba.ad_type,
    ba.status,
    ba.billing_mode,
    ba.budget_cents,
    ba.spent_cents,
    ba.cpc_cents,
    ba.target_region_id,
    ba.target_region_ids,
    ba.target_district,
    ba.target_age_min,
    ba.target_age_max,
    ba.target_interests,
    ba.impressions,
    ba.clicks,
    ba.starts_at,
    ba.ends_at,
    ba.created_at,
    ba.owner_id,
    p.username as owner_username,
    p.full_name as owner_full_name,
    p.avatar_url as owner_avatar_url
  from public.business_ads ba
  join public.profiles p on p.id = ba.owner_id
  left join public.businesses b on b.id = ba.business_id
  where (p_status is null or ba.status = p_status)
  order by ba.created_at desc
  limit p_limit;
end;
$$;

grant execute on function public.admin_list_business_ads(public.ad_status, int) to authenticated;
