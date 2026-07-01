-- Hikâye çerçeveleme (yakınlaştır/uzaklaştır) verisini bundle RPC'sine ekle
create or replace function public.get_story_bundle(
  p_viewer_id uuid,
  p_author_id uuid
)
returns table (
  story_id uuid,
  author_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  item_id uuid,
  sort_order int,
  media_type text,
  media_url text,
  thumb_url text,
  duration_sec numeric,
  sticker_category text,
  stickers_json jsonb,
  created_at timestamptz,
  has_reacted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as story_id,
    s.author_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    coalesce(pr.is_verified, false) as is_verified,
    si.id as item_id,
    si.sort_order,
    si.media_type,
    si.media_url,
    si.thumb_url,
    si.duration_sec,
    si.sticker_category,
    si.stickers_json,
    si.created_at,
    case
      when p_viewer_id is null then false
      else exists (
        select 1 from public.story_reactions sr
        where sr.story_item_id = si.id and sr.user_id = p_viewer_id
      )
    end as has_reacted
  from public.stories s
  join public.profiles pr on pr.id = s.author_id
  join public.story_items si on si.story_id = s.id
  where s.author_id = p_author_id
    and s.status = 'published'
    and s.expires_at > now()
    and si.status = 'published'
    and si.expires_at > now()
    and (p_viewer_id is null or not public.is_story_blocked(p_viewer_id, s.author_id))
  order by si.sort_order asc, si.created_at asc;
$$;

grant execute on function public.get_story_bundle(uuid, uuid) to authenticated, anon;
