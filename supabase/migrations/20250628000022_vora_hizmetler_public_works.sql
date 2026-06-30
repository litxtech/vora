-- Public usta işleri: portfolyo + tamamlanan platform işleri (profil ziyaretçileri)

create or replace function public.fetch_public_vora_provider_works(
  p_provider_id uuid,
  p_limit int default 30
)
returns table (
  work_id uuid,
  work_source text,
  title text,
  description text,
  before_image_url text,
  after_image_url text,
  media_urls text[],
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from (
    select
      pf.id as work_id,
      'portfolio'::text as work_source,
      pf.title,
      pf.description,
      pf.before_image_url,
      pf.after_image_url,
      coalesce(pf.media_urls, '{}'::text[]) as media_urls,
      pf.created_at as completed_at
    from public.vora_service_portfolio pf
    where pf.provider_id = p_provider_id

    union all

    select
      r.id as work_id,
      'completed_job'::text as work_source,
      r.title,
      nullif(left(trim(r.description), 240), '') as description,
      case
        when cardinality(coalesce(r.image_urls, '{}'::text[])) > 0
        then r.image_urls[1]
        else null
      end as before_image_url,
      r.completion_proof_image_url as after_image_url,
      (
        coalesce(r.image_urls, '{}'::text[])
        || case
          when r.completion_proof_video_url is not null
          then array[r.completion_proof_video_url]
          else '{}'::text[]
        end
      ) as media_urls,
      coalesce(r.completion_proof_submitted_at, r.updated_at) as completed_at
    from public.vora_service_requests r
    where r.accepted_provider_id = p_provider_id
      and r.status in ('completed', 'rated')
      and (
        r.completion_proof_image_url is not null
        or r.completion_proof_video_url is not null
        or cardinality(coalesce(r.image_urls, '{}'::text[])) > 0
      )
  ) works
  order by completed_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

grant execute on function public.fetch_public_vora_provider_works(uuid, int) to anon, authenticated;
