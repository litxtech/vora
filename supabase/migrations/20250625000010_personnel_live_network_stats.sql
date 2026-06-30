-- Personel Merkezi: canlı ağ sekmesi — iş sahibi ve personel bulan işletme sayıları

create or replace function public.get_personnel_center_stats(p_region_id text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'employer_count', coalesce((
      select count(distinct jl.author_id)::int
      from public.job_listings jl
      where jl.status in ('published', 'removed', 'hidden', 'draft', 'filled')
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0),
    'job_owner_count', coalesce((
      select count(distinct owner_id)::int
      from (
        select jl.author_id as owner_id
        from public.job_listings jl
        where jl.status in ('published', 'removed', 'hidden', 'draft', 'filled')
          and (p_region_id is null or jl.region_id = p_region_id)
        union
        select sr.author_id as owner_id
        from public.staff_requests sr
        where sr.status in ('published', 'removed', 'hidden', 'draft', 'filled')
          and (p_region_id is null or sr.region_id = p_region_id)
      ) owners
    ), 0),
    'businesses_with_hires', coalesce((
      select count(distinct business_id)::int
      from (
        select ja.employer_id as business_id
        from public.job_applications ja
        left join public.job_listings jl on jl.id = ja.job_id
        left join public.staff_requests sr on sr.id = ja.staff_request_id
        where ja.status = 'accepted'
          and (
            p_region_id is null
            or jl.region_id = p_region_id
            or sr.region_id = p_region_id
          )
        union
        select jl.author_id as business_id
        from public.job_listings jl
        where jl.status = 'filled'
          and (p_region_id is null or jl.region_id = p_region_id)
        union
        select sr.author_id as business_id
        from public.staff_requests sr
        where sr.status = 'filled'
          and (p_region_id is null or sr.region_id = p_region_id)
      ) businesses
    ), 0),
    'active_jobs', coalesce((
      select count(*)::int
      from public.job_listings jl
      where jl.status = 'published'
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0) + coalesce((
      select count(*)::int
      from public.staff_requests sr
      where sr.status = 'published'
        and (p_region_id is null or sr.region_id = p_region_id)
    ), 0),
    'successful_hires', coalesce((
      select count(*)::int
      from public.job_applications ja
      left join public.job_listings jl on jl.id = ja.job_id
      left join public.staff_requests sr on sr.id = ja.staff_request_id
      where ja.status = 'accepted'
        and (
          p_region_id is null
          or jl.region_id = p_region_id
          or sr.region_id = p_region_id
        )
    ), 0),
    'total_applications', coalesce((
      select count(*)::int
      from public.job_applications ja
      left join public.job_listings jl on jl.id = ja.job_id
      left join public.staff_requests sr on sr.id = ja.staff_request_id
      where (
        p_region_id is null
        or jl.region_id = p_region_id
        or sr.region_id = p_region_id
      )
    ), 0)
  );
$$;

grant execute on function public.get_personnel_center_stats(text) to anon, authenticated;
