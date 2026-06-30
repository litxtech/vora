-- Silinmiş veya mevcut olmayan gönderiler için post_views FK hatasını önler.
-- Önbellekte kalan eski gönderiler görüntülendiğinde sessizce false döner.

create or replace function public.record_post_view(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_id uuid;
begin
  if not exists (select 1 from public.posts where id = p_post_id) then
    return false;
  end if;

  if v_viewer_id is null then
    insert into public.post_views (post_id, viewer_id, is_unique)
    values (p_post_id, null, true);
    update public.posts set view_count = view_count + 1 where id = p_post_id;
    return true;
  end if;

  insert into public.post_views (post_id, viewer_id, is_unique)
  values (p_post_id, v_viewer_id, true)
  on conflict do nothing
  returning id into v_inserted_id;

  if v_inserted_id is not null then
    update public.posts set view_count = view_count + 1 where id = p_post_id;
    return true;
  end if;

  return false;
exception
  when foreign_key_violation then
    return false;
end;
$$;
