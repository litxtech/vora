-- Hikaye karesi silme (soft delete) — yazar kendi öğesini kaldırabilir

drop policy if exists story_items_update_own on public.story_items;
create policy story_items_update_own on public.story_items
  for update using (author_id = auth.uid());

-- Silinen kare sonrası bundle özetini doğru güncelle
create or replace function public.sync_story_bundle_on_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest record;
begin
  select
    coalesce(si.thumb_url, si.media_url) as thumb_url,
    si.created_at
  into v_latest
  from public.story_items si
  where si.story_id = new.story_id
    and si.status = 'published'
    and si.expires_at > now()
  order by si.sort_order desc, si.created_at desc
  limit 1;

  update public.stories s
  set
    item_count = (
      select count(*)::int
      from public.story_items si
      where si.story_id = new.story_id
        and si.status = 'published'
        and si.expires_at > now()
    ),
    latest_thumb_url = v_latest.thumb_url,
    latest_item_at = v_latest.created_at,
    updated_at = now()
  where s.id = new.story_id;

  return new;
end;
$$;
