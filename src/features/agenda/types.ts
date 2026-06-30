import type { DiscoveryPeriod, DiscoveryScope } from '@/features/discovery/types';
import type { RegionId } from '@/constants/regions';

export type TrendingTopic = {
  id: string;
  tag: string;
  regionId: string | null;
  scope: DiscoveryScope;
  period: DiscoveryPeriod;
  postCount: number;
  commentCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  trendScore: number;
  rank: number;
};

export type DailyAgendaItem = {
  id: string;
  tag: string;
  label: string;
  regionId: string | null;
  scope: DiscoveryScope;
  isManual: boolean;
  priority: number;
};

export type AgendaQuery = {
  scope: DiscoveryScope;
  period: DiscoveryPeriod;
  regionId: RegionId;
};
