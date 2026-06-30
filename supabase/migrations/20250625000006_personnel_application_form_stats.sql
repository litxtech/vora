-- Personel başvuru: herkese açık ilan başvuru istatistikleri + sahip kartına onay sayısı

create or replace function public.get_personnel_listings_application_stats(p_items jsonb)
returns table (
  listing_type text,
  listing_id uuid,
  applications_total int,
  applications_pending int,
  applications_accepted int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_listing_type text;
  v_listing_id uuid;
  v_total int;
  v_pending int;
  v_accepted int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_listing_type := v_item->>'listing_type';
    v_listing_id := nullif(v_item->>'listing_id', '')::uuid;

    if v_listing_id is null then
      continue;
    end if;

    v_total := 0;
    v_pending := 0;
    v_accepted := 0;

    if v_listing_type = 'job' then
      if not exists (
        select 1 from public.job_listings jl
        where jl.id = v_listing_id and jl.status = 'published'
      ) then
        continue;
      end if;

      select
        count(*)::int,
        count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int,
        count(*) filter (where ja.status = 'accepted')::int
      into v_total, v_pending, v_accepted
      from public.job_applications ja
      where ja.job_id = v_listing_id;
    elsif v_listing_type = 'staff' then
      if not exists (
        select 1 from public.staff_requests sr
        where sr.id = v_listing_id and sr.status = 'published'
      ) then
        continue;
      end if;

      select
        count(*)::int,
        count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int,
        count(*) filter (where ja.status = 'accepted')::int
      into v_total, v_pending, v_accepted
      from public.job_applications ja
      where ja.staff_request_id = v_listing_id;
    else
      continue;
    end if;

    listing_type := v_listing_type;
    listing_id := v_listing_id;
    applications_total := v_total;
    applications_pending := v_pending;
    applications_accepted := v_accepted;
    return next;
  end loop;
end;
$$;

grant execute on function public.get_personnel_listings_application_stats(jsonb) to anon, authenticated;

create or replace function public.get_personnel_listing_owner_stats(
  p_listing_type text,
  p_listing_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_view_count int := 0;
  v_views_7d int := 0;
  v_apps_total int := 0;
  v_apps_pending int := 0;
  v_apps_accepted int := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  if p_listing_type = 'job' then
    select jl.author_id, coalesce(jl.view_count, 0)
    into v_author_id, v_view_count
    from public.job_listings jl
    where jl.id = p_listing_id;

    if v_author_id is null or v_author_id <> auth.uid() then
      return jsonb_build_object('error', 'Yetkiniz yok.');
    end if;

    select count(*)::int into v_views_7d
    from public.job_listing_views jlv
    where jlv.listing_id = p_listing_id
      and jlv.created_at >= now() - interval '7 days';

    select count(*)::int,
      count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int,
      count(*) filter (where ja.status = 'accepted')::int
    into v_apps_total, v_apps_pending, v_apps_accepted
    from public.job_applications ja
    where ja.job_id = p_listing_id;
  elsif p_listing_type = 'staff' then
    select sr.author_id, coalesce(sr.view_count, 0)
    into v_author_id, v_view_count
    from public.staff_requests sr
    where sr.id = p_listing_id;

    if v_author_id is null or v_author_id <> auth.uid() then
      return jsonb_build_object('error', 'Yetkiniz yok.');
    end if;

    select count(*)::int into v_views_7d
    from public.staff_request_views srv
    where srv.request_id = p_listing_id
      and srv.created_at >= now() - interval '7 days';

    select count(*)::int,
      count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int,
      count(*) filter (where ja.status = 'accepted')::int
    into v_apps_total, v_apps_pending, v_apps_accepted
    from public.job_applications ja
    where ja.staff_request_id = p_listing_id;
  else
    return jsonb_build_object('error', 'Geçersiz ilan türü.');
  end if;

  return jsonb_build_object(
    'view_count', v_view_count,
    'views_last_7_days', v_views_7d,
    'applications_total', v_apps_total,
    'applications_pending', v_apps_pending,
    'applications_accepted', v_apps_accepted
  );
end;
$$;
