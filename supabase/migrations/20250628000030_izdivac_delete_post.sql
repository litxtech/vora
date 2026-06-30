-- İzdivaç duvarı: kendi paylaşımını kaldırma

create or replace function public.izdivac_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  delete from public.izdivac_posts
  where id = p_post_id and author_id = v_me;

  if not found then
    raise exception 'Paylaşım bulunamadı veya silme yetkiniz yok';
  end if;
end;
$$;

grant execute on function public.izdivac_delete_post(uuid) to authenticated;
