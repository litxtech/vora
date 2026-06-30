-- Personel Merkezi iş başvuru moderasyonu

create or replace function public.admin_list_job_applications(
  p_status text default null,
  p_limit int default 50
)
returns table (
  id uuid,
  status public.job_application_status,
  message text,
  created_at timestamptz,
  applicant_id uuid,
  applicant_username text,
  employer_id uuid,
  employer_username text,
  listing_title text,
  listing_type text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select
    ja.id,
    ja.status,
    ja.message,
    ja.created_at,
    ja.applicant_id,
    ap.username,
    ja.employer_id,
    ep.username,
    coalesce(jl.title, sr.title, '—'),
    case when ja.job_id is not null then 'job' else 'staff' end
  from public.job_applications ja
  join public.profiles ap on ap.id = ja.applicant_id
  join public.profiles ep on ep.id = ja.employer_id
  left join public.job_listings jl on jl.id = ja.job_id
  left join public.staff_requests sr on sr.id = ja.staff_request_id
  where p_status is null or ja.status::text = p_status
  order by ja.created_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_remove_job_application(p_application_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.job_applications where id = p_application_id;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'job_application', p_application_id, 'remove', coalesce(p_reason, 'Admin kaldırma'));
end; $$;

grant execute on function public.admin_list_job_applications(text, int) to authenticated;
grant execute on function public.admin_remove_job_application(uuid, text) to authenticated;
