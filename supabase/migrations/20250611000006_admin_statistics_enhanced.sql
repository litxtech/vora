-- Admin istatistik paneli — kapsamlı platform metrikleri

create or replace function public.get_admin_statistics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_today timestamptz := date_trunc('day', now());
  v_week timestamptz := now() - interval '7 days';
  v_month timestamptz := now() - interval '30 days';
  v_users_with_region int;
  v_total_published_posts int;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select count(*)::int into v_users_with_region
  from public.profiles
  where region_id is not null;

  select count(*)::int into v_total_published_posts
  from public.posts
  where status = 'published';

  select jsonb_build_object(
    'generated_at', now(),
    'overview', jsonb_build_object(
      'total_users', (select count(*)::int from public.profiles),
      'active_users_7d', (
        select count(*)::int from public.profiles
        where account_status = 'active'
          and coalesce(last_seen_at, updated_at) > now() - interval '7 days'
      ),
      'active_users_30d', (
        select count(*)::int from public.profiles
        where account_status = 'active'
          and coalesce(last_seen_at, updated_at) > now() - interval '30 days'
      ),
      'guest_users', (select count(*)::int from public.profiles where is_guest = true),
      'premium_users', (select count(*)::int from public.profiles where is_premium = true),
      'reporter_users', (
        select count(*)::int from public.profiles
        where role in ('verified_reporter', 'moderator', 'admin', 'super_admin')
      ),
      'verified_businesses', (select count(*)::int from public.businesses where is_verified = true),
      'total_businesses', (select count(*)::int from public.businesses),
      'total_posts', (select count(*)::int from public.posts),
      'published_posts', v_total_published_posts,
      'total_reels', (select count(*)::int from public.reels),
      'published_reels', (select count(*)::int from public.reels where status = 'published'),
      'total_comments', (select count(*)::int from public.post_comments),
      'total_messages', (select count(*)::int from public.messages),
      'total_conversations', (select count(*)::int from public.conversations),
      'total_communities', (select count(*)::int from public.communities),
      'total_channels', (select count(*)::int from public.channels),
      'total_events', (select count(*)::int from public.events),
      'total_jobs', (select count(*)::int from public.job_listings),
      'total_follows', (select count(*)::int from public.follows),
      'total_hashtags', (select count(*)::int from public.hashtags)
    ),
    'daily', jsonb_build_object(
      'registrations', (select count(*)::int from public.profiles where created_at >= v_today),
      'posts', (select count(*)::int from public.posts where created_at >= v_today),
      'reels', (select count(*)::int from public.reels where created_at >= v_today),
      'comments', (select count(*)::int from public.post_comments where created_at >= v_today),
      'messages', (select count(*)::int from public.messages where created_at >= v_today),
      'reports', (select count(*)::int from public.content_reports where created_at >= v_today),
      'new_follows', (select count(*)::int from public.follows where created_at >= v_today)
    ),
    'weekly', jsonb_build_object(
      'registrations', (select count(*)::int from public.profiles where created_at >= v_week),
      'posts', (select count(*)::int from public.posts where created_at >= v_week),
      'reels', (select count(*)::int from public.reels where created_at >= v_week),
      'active_users', (
        select count(*)::int from public.profiles
        where account_status = 'active'
          and coalesce(last_seen_at, updated_at) >= v_week
      )
    ),
    'moderation', jsonb_build_object(
      'pending_reports', (select count(*)::int from public.content_reports where status = 'pending'),
      'pending_verifications', (select count(*)::int from public.businesses where registration_status = 'pending'),
      'pending_identity_verifications', (
        select count(*)::int from public.identity_verification_requests
        where status in ('pending', 'in_review')
      ),
      'pending_reporter_apps', (select count(*)::int from public.reporter_applications where status = 'pending'),
      'pending_ads', (select count(*)::int from public.business_ads where status = 'pending'),
      'pending_appeals', (select count(*)::int from public.moderation_appeals where status = 'pending'),
      'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
      'disputed_vcts', (select count(*)::int from public.content_trust_records where status = 'disputed'),
      'pending_post_verifications', (select count(*)::int from public.post_verifications where status = 'reviewing'),
      'ai_review_queue', (
        select count(*)::int from public.ai_moderation_logs
        where action = 'review' and reviewed_at is null
      ),
      'pending_support_tickets', (
        select count(*)::int from public.support_tickets
        where status in ('open', 'in_progress', 'waiting_user')
      )
    ),
    'top_cities', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          r.name,
          count(p.id)::int as user_count,
          round(count(p.id) * 100.0 / nullif(v_users_with_region, 0), 1) as percentage
        from public.profiles p
        join public.regions r on r.id = p.region_id
        where p.region_id is not null
        group by r.id, r.name
        order by user_count desc
        limit 10
      ) t
    ),
    'top_users', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          p.id,
          p.username,
          p.full_name,
          p.contribution_score,
          (
            select count(*)::int
            from public.posts po
            where po.author_id = p.id and po.status = 'published'
          ) as post_count,
          (
            select count(*)::int
            from public.follows f
            where f.following_id = p.id
          ) as follower_count
        from public.profiles p
        where p.account_status = 'active'
        order by p.contribution_score desc
        limit 10
      ) t
    ),
    'top_posts', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          po.id,
          po.title,
          left(po.content, 120) as content,
          po.view_count,
          po.like_count,
          po.comment_count,
          pr.username as author_username
        from public.posts po
        join public.profiles pr on pr.id = po.author_id
        where po.status = 'published'
        order by po.view_count desc
        limit 10
      ) t
    ),
    'top_reels', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          r.id,
          left(r.caption, 120) as caption,
          r.view_count,
          r.like_count,
          r.comment_count,
          pr.username as author_username
        from public.reels r
        join public.profiles pr on pr.id = r.author_id
        where r.status = 'published'
        order by r.view_count desc
        limit 10
      ) t
    ),
    'top_categories', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          category::text,
          count(*)::int as post_count,
          round(count(*) * 100.0 / nullif(v_total_published_posts, 0), 1) as percentage
        from public.posts
        where status = 'published'
        group by category
        order by post_count desc
        limit 10
      ) t
    ),
    'top_hashtags', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select h.tag, h.post_count::int as usage_count
        from public.hashtags h
        order by h.post_count desc
        limit 10
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;
