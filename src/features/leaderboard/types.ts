import type { UserRole } from '@/types/database';
import type { LeaderboardBadgeFilter, LeaderboardMetric } from '@/features/leaderboard/constants';

export type LeaderboardEntry = {
  rank: number;
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  isPlatformCharm: boolean;
  isPioneer: boolean;
  metricValue: number;
};

export type LeaderboardViewerRank = {
  rank: number;
  metricValue: number;
};

export type LeaderboardResult = {
  entries: LeaderboardEntry[];
  viewer: LeaderboardViewerRank | null;
};

export type LeaderboardQuery = {
  metric: LeaderboardMetric;
  badgeFilter?: LeaderboardBadgeFilter;
  limit?: number;
};
