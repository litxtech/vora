-- Hikaye karesi silme: RLS + güvenli RPC (yetkiniz yok hatasını giderir)

drop policy if exists story_items_select_own on public.story_items;
create policy story_items_select_own on public.story_items
  for select using (author_id = auth.uid());

drop policy if exists story_items_update_own on public.story_items;
create policy story_items_update_own on public.story_items
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create or replace function public.delete_story_item(p_story_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_remaining int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select si.id, si.story_id, si.author_id
  into v_item
  from public.story_items si
  where si.id = p_story_item_id;

  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_item.author_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.story_items
  set status = 'removed'
  where id = p_story_item_id
    and author_id = auth.uid();

  select count(*)::int
  into v_remaining
  from public.story_items si
  where si.story_id = v_item.story_id
    and si.status = 'published'
    and si.expires_at > now();

  if v_remaining = 0 then
    update public.stories
    set status = 'archived', updated_at = now()
    where id = v_item.story_id
      and author_id = auth.uid();
  end if;

  return jsonb_build_object(
    'ok', true,
    'story_id', v_item.story_id,
    'remaining', v_remaining
  );
end;
$$;

revoke all on function public.delete_story_item(uuid) from public;
grant execute on function public.delete_story_item(uuid) to authenticated;
