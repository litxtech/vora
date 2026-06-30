import { LEADERBOARD_LIMIT } from '@/features/leaderboard/constants';
import type {
  LeaderboardEntry,
  LeaderboardQuery,
  LeaderboardResult,
  LeaderboardViewerRank,
} from '@/features/leaderboard/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

type LeaderboardRow = {
  rank: number;
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_platform_charm: boolean;
  is_pioneer: boolean;
  metric_value: number;
};

type LeaderboardRpcPayload = {
  entries?: LeaderboardRow[];
  viewer?: {
    rank: number;
    metric_value: number;
  } | null;
};

function mapEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    rank: Number(row.rank ?? 0),
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    isVerified: Boolean(row.is_verified),
    isPlatformCharm: Boolean(row.is_platform_charm),
    isPioneer: Boolean(row.is_pioneer),
    metricValue: Number(row.metric_value ?? 0),
  };
}

function mapViewer(viewer: LeaderboardRpcPayload['viewer']): LeaderboardViewerRank | null {
  if (!viewer?.rank) return null;
  return {
    rank: Number(viewer.rank),
    metricValue: Number(viewer.metric_value ?? 0),
  };
}

export async function fetchLeaderboard(query: LeaderboardQuery): Promise<LeaderboardResult> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_metric: query.metric,
    p_limit: query.limit ?? LEADERBOARD_LIMIT,
    p_badge_filter: query.metric === 'badges' ? (query.badgeFilter ?? 'all') : 'all',
  });

  if (error || !data) {
    return { entries: [], viewer: null };
  }

  const payload = data as LeaderboardRpcPayload;
  return {
    entries: (payload.entries ?? []).map(mapEntry),
    viewer: mapViewer(payload.viewer),
  };
}
