-- Gönderi kaldırılınca / gizlenince bağlı Reels kaydını da senkronize et

alter table public.reels
  add column if not exists source_post_id uuid references public.posts (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists reels_source_post_idx
  on public.reels (source_post_id)
  where source_post_id is not null;

create or replace function public.post_media_video_ids(p_media_urls text[])
returns uuid[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(distinct vid), '{}')
  from (
    select (
      substring(url from 'vora://video-processing/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
    )::uuid as vid
    from unnest(coalesce(p_media_urls, '{}'::text[])) as url
    where url like 'vora://video-processing/%'

    union

    select v.id as vid
    from unnest(coalesce(p_media_urls, '{}'::text[])) as url
    join public.videos v
      on v.mux_playback_id = substring(url from '(?:stream|image)\.mux\.com/([^./?]+)')
    where url ~ 'mux\.com/'
  ) matched
  where vid is not null;
$$;

create or replace function public.sync_reels_for_post_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_ids uuid[];
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status not in ('removed', 'hidden') then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  v_video_ids := public.post_media_video_ids(new.media_urls);

  update public.reels r
  set
    status = new.status,
    updated_at = now()
  where r.status = 'published'
    and (
      r.source_post_id = new.id
      or (
        cardinality(v_video_ids) > 0
        and r.video_id = any (v_video_ids)
        and r.author_id = new.author_id
      )
    );

  return new;
end;
$$;

drop trigger if exists posts_sync_linked_reels on public.posts;
create trigger posts_sync_linked_reels
  after update of status on public.posts
  for each row
  execute function public.sync_reels_for_post_status();

-- Mevcut gönderi–reel eşleşmelerini geriye dönük bağla
update public.reels r
set source_post_id = matched.post_id
from (
  select distinct on (r2.id)
    r2.id as reel_id,
    p.id as post_id
  from public.reels r2
  join public.posts p
    on p.author_id = r2.author_id
   and r2.video_id = any (public.post_media_video_ids(p.media_urls))
  where r2.source_post_id is null
  order by r2.id, abs(extract(epoch from (r2.created_at - p.created_at)))
) matched
where r.id = matched.reel_id
  and r.source_post_id is null;
