import { excludeCommunityPosts } from '@/features/communities/services/publicScope';
import { REGIONS } from '@/constants/regions';
import type { AgendaQuery, DailyAgendaItem, TrendingTopic } from '@/features/agenda/types';
import { supabase } from '@/lib/supabase/client';

type TrendingRow = {
  id: string;
  tag: string;
  region_id: string | null;
  scope: string;
  period: string;
  post_count: number;
  comment_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  trend_score: number;
  rank: number;
};

type AgendaRow = {
  id: string;
  tag: string;
  label: string;
  region_id: string | null;
  scope: string;
  is_manual: boolean;
  priority: number;
};

function mapTrending(row: TrendingRow): TrendingTopic {
  return {
    id: row.id,
    tag: row.tag,
    regionId: row.region_id,
    scope: row.scope as TrendingTopic['scope'],
    period: row.period as TrendingTopic['period'],
    postCount: row.post_count,
    commentCount: row.comment_count,
    likeCount: row.like_count,
    quoteCount: row.quote_count,
    viewCount: row.view_count,
    trendScore: Number(row.trend_score),
    rank: row.rank,
  };
}

function mapAgenda(row: AgendaRow): DailyAgendaItem {
  return {
    id: row.id,
    tag: row.tag,
    label: row.label,
    regionId: row.region_id,
    scope: row.scope as DailyAgendaItem['scope'],
    isManual: row.is_manual,
    priority: row.priority,
  };
}

export async function fetchTrendingTopics(query: AgendaQuery): Promise<TrendingTopic[]> {
  const { data, error } = await supabase.rpc('get_trending_topics', {
    p_region_id: query.regionId,
    p_scope: query.scope,
    p_period: query.period,
    p_limit: 20,
  });

  if (error || !data?.length) {
    return computeTrendingFallback(query);
  }

  return (data as TrendingRow[]).map(mapTrending);
}

async function computeTrendingFallback(query: AgendaQuery): Promise<TrendingTopic[]> {
  const hours = query.period === '24h' ? 24 : query.period === '7d' ? 168 : 720;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  let postsQuery = excludeCommunityPosts(
    supabase
    .from('posts')
    .select('id, content, like_count, comment_count, quote_count, view_count, created_at, region_id')
    .eq('status', 'published')
  ).gte('created_at', since);

  if (query.scope === 'region') {
    postsQuery = postsQuery.eq('region_id', query.regionId);
  }

  const { data: posts } = await postsQuery.limit(200);
  if (!posts?.length) return [];

  const tagStats = new Map<
    string,
    { postCount: number; likes: number; comments: number; quotes: number; views: number; latestAt: string }
  >();

  const tagRegex = /#([\p{L}\p{N}_]+)/gu;
  for (const post of posts) {
    const matches = post.content.matchAll(tagRegex);
    for (const match of matches) {
      const tag = match[1].toLowerCase();
      const existing = tagStats.get(tag) ?? {
        postCount: 0,
        likes: 0,
        comments: 0,
        quotes: 0,
        views: 0,
        latestAt: post.created_at,
      };
      existing.postCount += 1;
      existing.likes += post.like_count ?? 0;
      existing.comments += post.comment_count ?? 0;
      existing.quotes += post.quote_count ?? 0;
      existing.views += post.view_count ?? 0;
      if (post.created_at > existing.latestAt) existing.latestAt = post.created_at;
      tagStats.set(tag, existing);
    }
  }

  const scored = [...tagStats.entries()]
    .map(([tag, stats]) => {
      const recencyHours = (Date.now() - new Date(stats.latestAt).getTime()) / 3600000;
      const recencyBoost = Math.max(0, 1 - recencyHours / hours) * 50;
      const trendScore =
        stats.likes * 3 +
        stats.comments * 5 +
        stats.quotes * 4 +
        stats.views * 0.1 +
        recencyBoost;

      return {
        id: tag,
        tag,
        regionId: query.scope === 'region' ? query.regionId : null,
        scope: query.scope,
        period: query.period,
        postCount: stats.postCount,
        commentCount: stats.comments,
        likeCount: stats.likes,
        quoteCount: stats.quotes,
        viewCount: stats.views,
        trendScore,
        rank: 0,
      } satisfies TrendingTopic;
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 20)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return scored;
}

export async function fetchDailyAgenda(query: AgendaQuery): Promise<DailyAgendaItem[]> {
  const today = new Date().toISOString().slice(0, 10);

  // Bugün için kürasyon yapılmamış olabilir; bugüne kadarki en güncel gündemi getir
  // (tohum/eski tarihli kayıtlar da görünür kalır). Sadece tek bir tarihe sabitlemeyiz.
  let dbQuery = supabase
    .from('daily_agenda')
    .select('id, tag, label, region_id, scope, is_manual, priority, agenda_date')
    .lte('agenda_date', today)
    .order('agenda_date', { ascending: false })
    .order('priority', { ascending: false })
    .limit(40);

  if (query.scope === 'karadeniz') {
    dbQuery = dbQuery.eq('scope', 'karadeniz');
  } else {
    dbQuery = dbQuery.or(`scope.eq.karadeniz,and(scope.eq.region,region_id.eq.${query.regionId})`);
  }

  const { data, error } = await dbQuery;

  if (error || !data?.length) {
    return defaultAgenda(query);
  }

  // En güncel gündem tarihine ait satırları al; geçmiş tarihlerle karışmasın.
  const rows = data as (AgendaRow & { agenda_date: string })[];
  const latestDate = rows[0].agenda_date;
  const latest = rows.filter((r) => r.agenda_date === latestDate);

  return latest.map(mapAgenda);
}

function defaultAgenda(query: AgendaQuery): DailyAgendaItem[] {
  const items: DailyAgendaItem[] = [
    {
      id: 'default-karadeniz',
      tag: 'karadeniz',
      label: '#Karadeniz',
      regionId: null,
      scope: 'karadeniz',
      isManual: true,
      priority: 100,
    },
  ];

  if (query.scope === 'region') {
    const region = REGIONS.find((r) => r.id === query.regionId);
    if (region) {
      items.unshift({
        id: `default-${region.id}`,
        tag: region.id,
        label: `#${region.name}`,
        regionId: region.id,
        scope: 'region',
        isManual: true,
        priority: 110,
      });
    }

    if (query.regionId === 'trabzon') {
      items.unshift({
        id: 'default-trabzonspor',
        tag: 'trabzonspor',
        label: '#Trabzonspor',
        regionId: 'trabzon',
        scope: 'region',
        isManual: true,
        priority: 120,
      });
    }
  }

  return items;
}
