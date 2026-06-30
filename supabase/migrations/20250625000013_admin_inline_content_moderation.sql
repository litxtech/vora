-- Admin/moderatör: feed ve haritadan anında içerik moderasyonu

create or replace function public.admin_update_job_listing_status(
  p_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.job_listings
  set status = p_status
  where id = p_id;
end;
$$;

create or replace function public.admin_update_event_status(
  p_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.events
  set status = p_status, updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.admin_clear_explorer_presence(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  delete from public.explorer_presence where user_id = p_user_id;
end;
$$;

grant execute on function public.admin_update_job_listing_status(uuid, public.content_status) to authenticated;
grant execute on function public.admin_update_event_status(uuid, public.content_status) to authenticated;
grant execute on function public.admin_clear_explorer_presence(uuid) to authenticated;
