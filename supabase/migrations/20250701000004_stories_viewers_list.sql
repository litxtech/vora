-- Hikâye slaytı görüntüleyenleri (istatistik sayfası)

create or replace function public.get_story_item_viewers(
  p_author_id uuid,
  p_story_item_id uuid,
  p_limit int default 80
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_result jsonb;
begin
  select si.author_id into v_owner
  from public.story_items si
  where si.id = p_story_item_id;

  if v_owner is null or v_owner <> p_author_id or v_owner <> auth.uid() then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(row_data order by viewed_at desc),
    '[]'::jsonb
  )
  into v_result
  from (
    select jsonb_build_object(
      'userId', sv.viewer_id,
      'username', pr.username,
      'fullName', pr.full_name,
      'avatarUrl', pr.avatar_url,
      'watchedSeconds', sv.watched_seconds,
      'watchCompletion', sv.watch_completion,
      'viewedAt', sv.viewed_at
    ) as row_data,
    sv.viewed_at
    from public.story_views sv
    join public.profiles pr on pr.id = sv.viewer_id
    where sv.story_item_id = p_story_item_id
    order by sv.viewed_at desc
    limit greatest(1, least(p_limit, 120))
  ) sub;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.get_story_item_viewers(uuid, uuid, int) to authenticated;
