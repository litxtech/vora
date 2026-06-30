-- Bölüm 22 — Gündem Merkezi: günlük gündem ve otomatik trendler

create table public.trending_topics (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  region_id text references public.regions (id) on delete cascade,
  scope text not null check (scope in ('region', 'karadeniz')),
  period text not null check (period in ('24h', '7d', '30d')),
  post_count integer not null default 0,
  comment_count integer not null default 0,
  like_count integer not null default 0,
  quote_count integer not null default 0,
  view_count integer not null default 0,
  trend_score numeric not null default 0,
  rank integer not null default 0,
  computed_at timestamptz not null default now()
);

create unique index trending_topics_unique_idx
  on public.trending_topics (tag, scope, period, coalesce(region_id, '__all__'));

create index trending_topics_lookup_idx
  on public.trending_topics (scope, region_id, period, rank);

create table public.daily_agenda (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  label text not null,
  region_id text references public.regions (id) on delete cascade,
  scope text not null default 'region' check (scope in ('region', 'karadeniz')),
  is_manual boolean not null default true,
  priority integer not null default 0,
  agenda_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index daily_agenda_date_idx
  on public.daily_agenda (agenda_date desc, scope, region_id, priority desc);

-- Günlük gündem tohum verileri
insert into public.daily_agenda (tag, label, region_id, scope, priority) values
  ('trabzonspor', '#Trabzonspor', 'trabzon', 'region', 100),
  ('akcaabat', '#Akçaabat', 'trabzon', 'region', 90),
  ('yomra', '#Yomra', 'trabzon', 'region', 80),
  ('karadeniz', '#Karadeniz', null, 'karadeniz', 100),
  ('rize', '#Rize', 'rize', 'region', 90),
  ('giresun', '#Giresun', 'giresun', 'region', 90),
  ('ordu', '#Ordu', 'ordu', 'region', 90),
  ('samsun', '#Samsun', 'samsun', 'region', 90),
  ('artvin', '#Artvin', 'artvin', 'region', 90)
on conflict do nothing;

-- Trend hesaplama ve önbellek yenileme
create or replace function public.refresh_trending_topics(
  p_region_id text default 'trabzon',
  p_scope text default 'region',
  p_period text default '24h'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer;
  v_since timestamptz;
  v_count integer := 0;
begin
  v_hours := case p_period
    when '24h' then 24
    when '7d' then 168
    when '30d' then 720
    else 24
  end;
  v_since := now() - (v_hours || ' hours')::interval;

  delete from public.trending_topics
  where scope = p_scope
    and period = p_period
    and (
      (p_scope = 'karadeniz' and region_id is null)
      or (p_scope = 'region' and region_id = p_region_id)
    );

  insert into public.trending_topics (
    tag, region_id, scope, period,
    post_count, comment_count, like_count, quote_count, view_count,
    trend_score, rank, computed_at
  )
  select
    h.tag,
    case when p_scope = 'karadeniz' then null else agg.region_id end,
    p_scope,
    p_period,
    agg.post_count,
    agg.comment_count,
    agg.like_count,
    agg.quote_count,
    agg.view_count,
    public.discovery_trend_score(
      agg.like_count::integer,
      agg.comment_count::integer,
      agg.quote_count::integer,
      0,
      0,
      agg.view_count::integer,
      0,
      0,
      0,
      false,
      false,
      agg.latest_at,
      v_hours
    ),
    row_number() over (order by public.discovery_trend_score(
      agg.like_count::integer,
      agg.comment_count::integer,
      agg.quote_count::integer,
      0,
      0,
      agg.view_count::integer,
      0,
      0,
      0,
      false,
      false,
      agg.latest_at,
      v_hours
    ) desc)::integer,
    now()
  from (
    select
      h.id as hashtag_id,
      h.tag,
      p.region_id,
      count(distinct p.id)::integer as post_count,
      coalesce(sum(p.comment_count), 0)::integer as comment_count,
      coalesce(sum(p.like_count), 0)::integer as like_count,
      coalesce(sum(p.quote_count), 0)::integer as quote_count,
      coalesce(sum(p.view_count), 0)::integer as view_count,
      max(p.created_at) as latest_at
    from public.hashtags h
    join public.post_hashtags ph on ph.hashtag_id = h.id
    join public.posts p on p.id = ph.post_id
    where p.status = 'published'
      and p.created_at >= v_since
      and (
        p_scope = 'karadeniz'
        or p.region_id = p_region_id
      )
    group by h.id, h.tag, p.region_id
    having count(distinct p.id) >= 1
  ) agg
  join public.hashtags h on h.id = agg.hashtag_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_trending_topics(
  p_region_id text default 'trabzon',
  p_scope text default 'region',
  p_period text default '24h',
  p_limit integer default 20
)
returns setof public.trending_topics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale boolean;
begin
  select not exists (
    select 1 from public.trending_topics t
    where t.scope = p_scope
      and t.period = p_period
      and (
        (p_scope = 'karadeniz' and t.region_id is null)
        or (p_scope = 'region' and t.region_id = p_region_id)
      )
      and t.computed_at > now() - interval '1 hour'
  ) into v_stale;

  if v_stale then
    perform public.refresh_trending_topics(p_region_id, p_scope, p_period);
  end if;

  return query
  select t.*
  from public.trending_topics t
  where t.scope = p_scope
    and t.period = p_period
    and (
      (p_scope = 'karadeniz' and t.region_id is null)
      or (p_scope = 'region' and t.region_id = p_region_id)
    )
  order by t.rank asc
  limit p_limit;
end;
$$;

alter table public.trending_topics enable row level security;
alter table public.daily_agenda enable row level security;

create policy "trending_topics_public_read" on public.trending_topics
  for select to anon, authenticated using (true);

create policy "daily_agenda_public_read" on public.daily_agenda
  for select to anon, authenticated using (true);

create policy "daily_agenda_admin_write" on public.daily_agenda
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

grant execute on function public.refresh_trending_topics(text, text, text) to authenticated;
grant execute on function public.get_trending_topics(text, text, text, integer) to anon, authenticated;
