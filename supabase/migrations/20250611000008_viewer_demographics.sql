-- Premium: izleyici demografisi (cinsiyet, yaş grubu, bölge, ilçe)
-- Benzersiz izleyiciler: gönderi + reel + profil görüntülemeleri

create or replace function public.get_viewer_demographics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_premium boolean;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  select coalesce(p.is_premium, false) into v_premium
  from public.profiles p
  where p.id = v_user_id;

  if not v_premium then
    raise exception 'İzleyici demografisi Premium özelliğidir';
  end if;

  with unique_viewers as (
    select distinct v.viewer_id as id
    from (
      select pv.viewer_id
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where p.author_id = v_user_id
        and pv.viewer_id is not null
        and pv.viewer_id <> v_user_id
      union
      select rv.viewer_id
      from public.reel_views rv
      join public.reels r on r.id = rv.reel_id
      where r.author_id = v_user_id
        and rv.viewer_id <> v_user_id
      union
      select prv.viewer_id
      from public.profile_views prv
      where prv.profile_id = v_user_id
        and prv.viewer_id is not null
        and prv.viewer_id <> v_user_id
    ) v
  ),
  viewer_profiles as (
    select
      uv.id,
      pr.gender,
      pr.birth_date,
      pr.region_id,
      nullif(trim(pr.district), '') as district,
      reg.name as region_name
    from unique_viewers uv
    join public.profiles pr on pr.id = uv.id
    left join public.regions reg on reg.id = pr.region_id
  ),
  gender_stats as (
    select coalesce(vp.gender::text, 'unknown') as key, count(*)::int as count
    from viewer_profiles vp
    group by 1
  ),
  age_stats as (
    select
      case
        when vp.birth_date is null then 'unknown'
        when extract(year from age(current_date, vp.birth_date)) < 18 then 'under_18'
        when extract(year from age(current_date, vp.birth_date)) < 25 then '18_24'
        when extract(year from age(current_date, vp.birth_date)) < 35 then '25_34'
        when extract(year from age(current_date, vp.birth_date)) < 45 then '35_44'
        when extract(year from age(current_date, vp.birth_date)) < 55 then '45_54'
        else '55_plus'
      end as key,
      count(*)::int as count
    from viewer_profiles vp
    group by 1
  ),
  region_stats as (
    select
      coalesce(vp.region_id, 'unknown') as key,
      coalesce(vp.region_name, 'Bilinmiyor') as label,
      count(*)::int as count
    from viewer_profiles vp
    group by 1, 2
    order by count(*) desc
    limit 8
  ),
  district_stats as (
    select
      lower(vp.district) as key,
      vp.district as label,
      count(*)::int as count
    from viewer_profiles vp
    where vp.district is not null
    group by 1, 2
    order by count(*) desc
    limit 8
  )
  select jsonb_build_object(
    'total_viewers', (select count(*)::int from viewer_profiles),
    'gender', coalesce(
      (select jsonb_agg(jsonb_build_object('key', g.key, 'count', g.count) order by g.count desc) from gender_stats g),
      '[]'::jsonb
    ),
    'age_groups', coalesce(
      (select jsonb_agg(jsonb_build_object('key', a.key, 'count', a.count) order by a.count desc) from age_stats a),
      '[]'::jsonb
    ),
    'regions', coalesce(
      (select jsonb_agg(jsonb_build_object('key', r.key, 'label', r.label, 'count', r.count) order by r.count desc) from region_stats r),
      '[]'::jsonb
    ),
    'districts', coalesce(
      (select jsonb_agg(jsonb_build_object('key', d.key, 'label', d.label, 'count', d.count) order by d.count desc) from district_stats d),
      '[]'::jsonb
    )
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_viewer_demographics() to authenticated;
