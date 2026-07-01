-- Post-media: hikaye videoları dahil
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm'
]
where id = 'post-media';

-- Hikâye slaytı etkileşimleri (beğeni + DM yanıtları)
create or replace function public.get_story_item_engagement(
  p_author_id uuid,
  p_story_item_id uuid
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
    return '{"reactions":[],"replies":[]}'::jsonb;
  end if;

  select jsonb_build_object(
    'reactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', sr.user_id,
          'username', pr.username,
          'fullName', pr.full_name,
          'avatarUrl', pr.avatar_url,
          'emoji', sr.emoji,
          'createdAt', sr.created_at
        )
        order by sr.created_at desc
      )
      from public.story_reactions sr
      join public.profiles pr on pr.id = sr.user_id
      where sr.story_item_id = p_story_item_id
    ), '[]'::jsonb),
    'replies', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select jsonb_build_object(
          'messageId', m.id,
          'senderId', m.sender_id,
          'username', sp.username,
          'fullName', sp.full_name,
          'avatarUrl', sp.avatar_url,
          'content', m.content,
          'createdAt', m.created_at
        ) as row_data,
        m.created_at
        from public.messages m
        join public.profiles sp on sp.id = m.sender_id
        where m.deleted_for_all = false
          and m.metadata is not null
          and m.metadata->>'type' = 'story_reply'
          and m.metadata->>'storyItemId' = p_story_item_id::text
        limit 80
      ) sub
    ), '[]'::jsonb)
  ) into v_result;

  return coalesce(v_result, '{"reactions":[],"replies":[]}'::jsonb);
end;
$$;

grant execute on function public.get_story_item_engagement(uuid, uuid) to authenticated;
