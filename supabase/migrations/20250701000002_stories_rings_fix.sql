-- Story ring RPC: aktif slayt sayımı + izlenmemiş mantığı düzeltmesi

create or replace function public.get_story_rings(
  p_viewer_id uuid,
  p_cursor timestamptz default null,
  p_limit int default 40,
  p_region_id text default null
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  story_id uuid,
  item_count int,
  preview_thumb text,
  latest_item_at timestamptz,
  has_unseen boolean,
  region_id text
)
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select
      s.id as story_id,
      s.author_id,
      count(si.id)::int as item_count,
      max(coalesce(si.thumb_url, si.media_url)) filter (
        where si.created_at = (
          select max(si2.created_at)
          from public.story_items si2
          where si2.story_id = s.id
            and si2.status = 'published'
            and si2.expires_at > now()
        )
      ) as latest_thumb_url,
      max(si.created_at) as latest_item_at,
      s.region_id
    from public.stories s
    join public.profiles p on p.id = s.author_id
    join public.story_items si on si.story_id = s.id
    where s.status = 'published'
      and s.expires_at > now()
      and s.audience = 'public'
      and p.account_status = 'active'
      and si.status = 'published'
      and si.expires_at > now()
      and (p_cursor is null or coalesce(s.latest_item_at, si.created_at) < p_cursor)
      and (p_viewer_id is null or not public.is_story_blocked(p_viewer_id, s.author_id))
    group by s.id, s.author_id, s.region_id
  )
  select
    a.author_id as user_id,
    pr.username,
    pr.full_name,
    pr.avatar_url,
    coalesce(pr.is_verified, false) as is_verified,
    a.story_id,
    a.item_count,
    a.latest_thumb_url as preview_thumb,
    a.latest_item_at,
    case
      when p_viewer_id is null then true
      when a.author_id = p_viewer_id then false
      else exists (
        select 1
        from public.story_items si
        where si.story_id = a.story_id
          and si.status = 'published'
          and si.expires_at > now()
          and not exists (
            select 1
            from public.story_views sv
            where sv.story_item_id = si.id
              and sv.viewer_id = p_viewer_id
          )
      )
    end as has_unseen,
    a.region_id
  from active a
  join public.profiles pr on pr.id = a.author_id
  order by a.latest_item_at desc nulls last
  limit greatest(1, least(p_limit, 60));
$$;

grant execute on function public.get_story_rings(uuid, timestamptz, int, text) to authenticated, anon;
