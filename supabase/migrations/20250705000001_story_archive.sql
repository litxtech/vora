-- Hikâye arşivi: yazar kendi geçmiş hikâye karelerini listeleyebilir.

create or replace function public.get_story_archive(
  p_cursor timestamptz default null,
  p_limit int default 36
)
returns table (
  item_id uuid,
  story_id uuid,
  media_type text,
  media_url text,
  thumb_url text,
  duration_sec numeric,
  stickers_json jsonb,
  created_at timestamptz,
  expires_at timestamptz,
  is_active boolean,
  view_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    si.id as item_id,
    si.story_id,
    si.media_type,
    si.media_url,
    si.thumb_url,
    si.duration_sec,
    si.stickers_json,
    si.created_at,
    si.expires_at,
    (si.expires_at > now() and si.status = 'published') as is_active,
    (
      select count(distinct sv.viewer_id)::int
      from public.story_views sv
      where sv.story_item_id = si.id
    ) as view_count
  from public.story_items si
  where si.author_id = auth.uid()
    and si.status = 'published'
    and (p_cursor is null or si.created_at < p_cursor)
  order by si.created_at desc
  limit greatest(1, least(coalesce(p_limit, 36), 60));
$$;

revoke all on function public.get_story_archive(timestamptz, int) from public;
grant execute on function public.get_story_archive(timestamptz, int) to authenticated;
