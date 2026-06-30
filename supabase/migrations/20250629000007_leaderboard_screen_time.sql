-- Liderlik tablosu: "Ekran Süresi" metriği (uygulamada geçirilen dakika)
-- Yerel ekran süresi özelliğinden bağımsızdır; bu sayaç sıralama için sunucuda tutulur.

alter table public.profiles
  add column if not exists app_active_minutes bigint not null default 0,
  add column if not exists app_active_minute_at timestamptz;

create index if not exists profiles_leaderboard_screen_time_idx
  on public.profiles (app_active_minutes desc nulls last)
  where account_status = 'active';

-- Aktif dakika sayacı: istemci uygulama ön plandayken dakikada bir çağırır.
-- Dakika kovasına göre idempotent — aynı dakika içinde tekrar çağrılırsa artmaz.
create or replace function public.track_app_active_minute()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  update public.profiles
  set
    app_active_minutes = coalesce(app_active_minutes, 0) + 1,
    app_active_minute_at = now()
  where id = v_user_id
    and account_status = 'active'
    and (
      app_active_minute_at is null
      or date_trunc('minute', app_active_minute_at) < date_trunc('minute', now())
    );
end;
$$;

revoke all on function public.track_app_active_minute() from public;
grant execute on function public.track_app_active_minute() to authenticated;

-- get_leaderboard: 'screen_time' metriğini ekle (app_active_minutes'e göre sırala)
create or replace function public.get_leaderboard(
  p_metric text default 'trust',
  p_limit int default 50,
  p_badge_filter text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_metric text := lower(trim(coalesce(p_metric, 'trust')));
  v_badge_filter text := lower(trim(coalesce(p_badge_filter, 'all')));
  v_entries jsonb;
  v_viewer jsonb := null;
  v_viewer_metric bigint;
  v_viewer_rank bigint;
begin
  if v_metric not in ('trust', 'contribution', 'followers', 'engagement', 'badges', 'screen_time') then
    raise exception 'invalid leaderboard metric: %', p_metric;
  end if;

  if v_badge_filter not in ('all', 'pioneer', 'platform_charm') then
    v_badge_filter := 'all';
  end if;

  with base as (
    select
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.role::text as role,
      coalesce(p.is_verified, false) as is_verified,
      coalesce(p.is_platform_charm, false) as is_platform_charm,
      coalesce(p.is_pioneer, false) as is_pioneer,
      case v_metric
        when 'trust' then coalesce(p.trust_score, 0)::bigint
        when 'contribution' then coalesce(p.contribution_score, 0)::bigint
        when 'screen_time' then coalesce(p.app_active_minutes, 0)::bigint
        when 'followers' then (
          select count(*)::bigint
          from public.follows f
          where f.following_id = p.id
        )
        when 'engagement' then (
          coalesce((
            select sum(po.like_count + po.comment_count)::bigint
            from public.posts po
            where po.author_id = p.id and po.status = 'published'
          ), 0)
          + coalesce((
            select sum(r.like_count + r.comment_count)::bigint
            from public.reels r
            where r.author_id = p.id and r.status = 'published'
          ), 0)
        )
        when 'badges' then coalesce(p.trust_score, 0)::bigint
      end as metric_value
    from public.profiles p
    where p.account_status = 'active'
      and p.username is not null
      and trim(p.username) <> ''
      and (
        v_metric <> 'badges'
        or (
          (v_badge_filter = 'all' and (coalesce(p.is_platform_charm, false) or coalesce(p.is_pioneer, false)))
          or (v_badge_filter = 'pioneer' and coalesce(p.is_pioneer, false))
          or (v_badge_filter = 'platform_charm' and coalesce(p.is_platform_charm, false))
        )
      )
  ),
  ranked as (
    select
      b.*,
      row_number() over (
        order by
          b.metric_value desc,
          case when v_metric = 'badges' then b.is_platform_charm::int else 0 end desc,
          case when v_metric = 'badges' then b.is_pioneer::int else 0 end desc,
          b.username asc
      ) as rank
    from base b
    where b.metric_value > 0 or v_metric in ('trust', 'contribution', 'badges')
  ),
  top_rows as (
    select *
    from ranked
    order by rank
    limit v_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', r.rank,
        'id', r.id,
        'username', r.username,
        'full_name', r.full_name,
        'avatar_url', r.avatar_url,
        'role', r.role,
        'is_verified', r.is_verified,
        'is_platform_charm', r.is_platform_charm,
        'is_pioneer', r.is_pioneer,
        'metric_value', r.metric_value
      )
      order by r.rank
    ),
    '[]'::jsonb
  )
  into v_entries
  from top_rows r;

  if v_viewer_id is not null then
    select b.metric_value
    into v_viewer_metric
    from (
      select
        p.id,
        case v_metric
          when 'trust' then coalesce(p.trust_score, 0)::bigint
          when 'contribution' then coalesce(p.contribution_score, 0)::bigint
          when 'screen_time' then coalesce(p.app_active_minutes, 0)::bigint
          when 'followers' then (
            select count(*)::bigint
            from public.follows f
            where f.following_id = p.id
          )
          when 'engagement' then (
            coalesce((
              select sum(po.like_count + po.comment_count)::bigint
              from public.posts po
              where po.author_id = p.id and po.status = 'published'
            ), 0)
            + coalesce((
              select sum(r.like_count + r.comment_count)::bigint
              from public.reels r
              where r.author_id = p.id and r.status = 'published'
            ), 0)
          )
          when 'badges' then coalesce(p.trust_score, 0)::bigint
        end as metric_value,
        coalesce(p.is_platform_charm, false) as is_platform_charm,
        coalesce(p.is_pioneer, false) as is_pioneer
      from public.profiles p
      where p.id = v_viewer_id
        and p.account_status = 'active'
    ) b
    where
      v_metric <> 'badges'
      or (
        (v_badge_filter = 'all' and (b.is_platform_charm or b.is_pioneer))
        or (v_badge_filter = 'pioneer' and b.is_pioneer)
        or (v_badge_filter = 'platform_charm' and b.is_platform_charm)
      );

    if v_viewer_metric is not null then
      with base as (
        select
          p.id,
          case v_metric
            when 'trust' then coalesce(p.trust_score, 0)::bigint
            when 'contribution' then coalesce(p.contribution_score, 0)::bigint
            when 'screen_time' then coalesce(p.app_active_minutes, 0)::bigint
            when 'followers' then (
              select count(*)::bigint
              from public.follows f
              where f.following_id = p.id
            )
            when 'engagement' then (
              coalesce((
                select sum(po.like_count + po.comment_count)::bigint
                from public.posts po
                where po.author_id = p.id and po.status = 'published'
              ), 0)
              + coalesce((
                select sum(r.like_count + r.comment_count)::bigint
                from public.reels r
                where r.author_id = p.id and r.status = 'published'
              ), 0)
            )
            when 'badges' then coalesce(p.trust_score, 0)::bigint
          end as metric_value,
          coalesce(p.is_platform_charm, false) as is_platform_charm,
          coalesce(p.is_pioneer, false) as is_pioneer,
          p.username
        from public.profiles p
        where p.account_status = 'active'
          and p.username is not null
          and trim(p.username) <> ''
          and (
            v_metric <> 'badges'
            or (
              (v_badge_filter = 'all' and (coalesce(p.is_platform_charm, false) or coalesce(p.is_pioneer, false)))
              or (v_badge_filter = 'pioneer' and coalesce(p.is_pioneer, false))
              or (v_badge_filter = 'platform_charm' and coalesce(p.is_platform_charm, false))
            )
          )
      ),
      ranked as (
        select
          b.id,
          b.metric_value,
          row_number() over (
            order by
              b.metric_value desc,
              case when v_metric = 'badges' then b.is_platform_charm::int else 0 end desc,
              case when v_metric = 'badges' then b.is_pioneer::int else 0 end desc,
              b.username asc
          ) as rank
        from base b
        where b.metric_value > 0 or v_metric in ('trust', 'contribution', 'badges')
      )
      select r.rank
      into v_viewer_rank
      from ranked r
      where r.id = v_viewer_id;

      if v_viewer_rank is not null then
        v_viewer := jsonb_build_object(
          'rank', v_viewer_rank,
          'metric_value', v_viewer_metric
        );
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'entries', coalesce(v_entries, '[]'::jsonb),
    'viewer', v_viewer
  );
end;
$$;

revoke all on function public.get_leaderboard(text, int, text) from public;
grant execute on function public.get_leaderboard(text, int, text) to authenticated;
