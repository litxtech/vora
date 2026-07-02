-- Story link tap / swipe-up analytics

create table if not exists public.story_link_actions (
  id uuid primary key default gen_random_uuid(),
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  link_id text not null,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('tap', 'swipe_up')),
  created_at timestamptz not null default now()
);

create index if not exists story_link_actions_item_idx
  on public.story_link_actions (story_item_id);

create index if not exists story_link_actions_link_idx
  on public.story_link_actions (story_item_id, link_id);

alter table public.story_link_actions enable row level security;

drop policy if exists story_link_actions_insert on public.story_link_actions;
create policy story_link_actions_insert on public.story_link_actions
  for insert to authenticated
  with check (viewer_id = auth.uid());

drop policy if exists story_link_actions_select on public.story_link_actions;
create policy story_link_actions_select on public.story_link_actions
  for select to authenticated
  using (
    exists (
      select 1
      from public.story_items si
      join public.stories s on s.id = si.story_id
      where si.id = story_item_id
        and s.author_id = auth.uid()
    )
  );

create or replace function public.record_story_link_action(
  p_viewer_id uuid,
  p_story_item_id uuid,
  p_link_id text,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'unauthorized';
  end if;

  if p_action not in ('tap', 'swipe_up') then
    raise exception 'invalid action';
  end if;

  insert into public.story_link_actions (story_item_id, link_id, viewer_id, action)
  values (p_story_item_id, p_link_id, p_viewer_id, p_action);
end;
$$;

grant execute on function public.record_story_link_action(uuid, uuid, text, text) to authenticated;

-- Extend insights RPC with link interaction counts
drop function if exists public.get_story_insights(uuid, uuid);

create or replace function public.get_story_insights(
  p_author_id uuid,
  p_story_id uuid
)
returns table (
  story_id uuid,
  total_views int,
  unique_viewers int,
  item_id uuid,
  sort_order int,
  thumb_url text,
  media_type text,
  item_views int,
  avg_watched_seconds numeric,
  avg_completion numeric,
  tap_forward_count int,
  tap_back_count int,
  swipe_forward_count int,
  swipe_back_count int,
  auto_forward_count int,
  exited_early_count int,
  link_tap_count int,
  link_swipe_up_count int,
  link_stats jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as story_id,
    s.view_count as total_views,
    (select count(distinct sv.viewer_id)::int from public.story_views sv where sv.story_id = s.id) as unique_viewers,
    si.id as item_id,
    si.sort_order,
    coalesce(si.thumb_url, si.media_url) as thumb_url,
    si.media_type,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id) as item_views,
    coalesce((select avg(sv.watched_seconds) from public.story_views sv where sv.story_item_id = si.id), 0) as avg_watched_seconds,
    coalesce((select avg(sv.watch_completion) from public.story_views sv where sv.story_item_id = si.id), 0) as avg_completion,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'tap_forward') as tap_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'tap_back') as tap_back_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'swipe_forward') as swipe_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'swipe_back') as swipe_back_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.navigation = 'auto_forward') as auto_forward_count,
    (select count(*)::int from public.story_views sv where sv.story_item_id = si.id and sv.exited_early) as exited_early_count,
    (select count(*)::int from public.story_link_actions sla where sla.story_item_id = si.id and sla.action = 'tap') as link_tap_count,
    (select count(*)::int from public.story_link_actions sla where sla.story_item_id = si.id and sla.action = 'swipe_up') as link_swipe_up_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'link_id', grouped.link_id,
            'tap_count', grouped.tap_count,
            'swipe_up_count', grouped.swipe_up_count
          )
          order by grouped.link_id
        )
        from (
          select
            sla.link_id,
            count(*) filter (where sla.action = 'tap')::int as tap_count,
            count(*) filter (where sla.action = 'swipe_up')::int as swipe_up_count
          from public.story_link_actions sla
          where sla.story_item_id = si.id
          group by sla.link_id
        ) grouped
      ),
      '[]'::jsonb
    ) as link_stats
  from public.stories s
  join public.story_items si on si.story_id = s.id
  where s.id = p_story_id
    and s.author_id = p_author_id
    and s.author_id = auth.uid()
  order by si.sort_order asc;
$$;

grant execute on function public.get_story_insights(uuid, uuid) to authenticated;
