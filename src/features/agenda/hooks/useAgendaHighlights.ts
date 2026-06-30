import { useEffect, useState } from 'react';
import type { RegionId } from '@/constants/regions';
import { fetchDailyAgenda, fetchTrendingTopics } from '@/features/agenda/services/agendaData';
import type { AgendaQuery, DailyAgendaItem, TrendingTopic } from '@/features/agenda/types';
import { fetchPopularHashtags } from '@/features/hashtag/services/hashtagData';

export type AgendaHighlight = {
  tag: string;
  label: string;
  kind: 'agenda' | 'trend' | 'popular';
  rank?: number;
};

type UseAgendaHighlightsOptions = {
  regionId: RegionId;
  karadenizWide?: boolean;
  limit?: number;
  enabled?: boolean;
  includePopular?: boolean;
};

function normalizeTagKey(tag: string): string {
  return tag.toLowerCase().replace(/^#/, '').trim();
}

function mergeHighlights(
  agenda: DailyAgendaItem[],
  trends: TrendingTopic[],
  popularTags: string[],
  limit: number,
): AgendaHighlight[] {
  const seen = new Set<string>();
  const merged: AgendaHighlight[] = [];

  const push = (entry: Omit<AgendaHighlight, 'tag'> & { tag: string }) => {
    if (merged.length >= limit) return;
    const key = normalizeTagKey(entry.tag);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push({ ...entry, tag: key });
  };

  for (const item of agenda) {
    push({ tag: item.tag, label: item.label, kind: 'agenda' });
  }

  for (const topic of trends) {
    push({
      tag: topic.tag,
      label: `#${topic.tag}`,
      kind: 'trend',
      rank: topic.rank,
    });
  }

  for (const tag of popularTags) {
    push({ tag, label: `#${tag}`, kind: 'popular' });
  }

  return merged;
}

export function useAgendaHighlights({
  regionId,
  karadenizWide = false,
  limit = 10,
  enabled = true,
  includePopular = false,
}: UseAgendaHighlightsOptions) {
  const [items, setItems] = useState<AgendaHighlight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    let cancelled = false;
    const query: AgendaQuery = {
      scope: karadenizWide ? 'karadeniz' : 'region',
      period: '24h',
      regionId,
    };

    setLoading(true);

    Promise.all([
      fetchDailyAgenda(query),
      fetchTrendingTopics(query),
      includePopular ? fetchPopularHashtags(limit) : Promise.resolve([]),
    ])
      .then(([agenda, trends, popularTags]) => {
        if (cancelled) return;
        setItems(mergeHighlights(agenda, trends, popularTags, limit));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, includePopular, karadenizWide, limit, regionId]);

  return { items, loading };
}
