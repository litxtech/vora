-- Personel Merkezi: ilan sahibi okuma/kaldırma + bölgesel istatistikler

drop policy if exists "job_listings_author_read_own" on public.job_listings;
create policy "job_listings_author_read_own" on public.job_listings
  for select using (auth.uid() = author_id);

drop policy if exists "job_listings_author_update" on public.job_listings;
create policy "job_listings_author_update" on public.job_listings
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create or replace function public.remove_own_job_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.job_listings
  set status = 'removed'
  where id = p_listing_id
    and author_id = auth.uid()
    and status in ('published', 'draft', 'hidden');

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'İlan bulunamadı veya kaldırma yetkiniz yok.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.remove_own_job_listing(uuid) to authenticated;

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
      where jl.status in ('published', 'removed', 'hidden', 'draft')
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0),
    'active_jobs', coalesce((
      select count(*)::int
      from public.job_listings jl
      where jl.status = 'published'
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0),
    'successful_hires', coalesce((
      select count(*)::int
      from public.job_applications ja
      inner join public.job_listings jl on jl.id = ja.job_id
      where ja.status = 'accepted'
        and ja.job_id is not null
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0),
    'total_applications', coalesce((
      select count(*)::int
      from public.job_applications ja
      inner join public.job_listings jl on jl.id = ja.job_id
      where ja.job_id is not null
        and (p_region_id is null or jl.region_id = p_region_id)
    ), 0)
  );
$$;

grant execute on function public.get_personnel_center_stats(text) to anon, authenticated;
