type TrendMetrics = {
  likes?: number;
  comments?: number;
  quotes?: number;
  saves?: number;
  shares?: number;
  views?: number;
  completionRate?: number;
  goingCount?: number;
  followerCount?: number;
  isUrgent?: boolean;
  isVerified?: boolean;
  createdAt: string;
  periodHours: number;
};

export function computeTrendScore(metrics: TrendMetrics): number {
  const likes = metrics.likes ?? 0;
  const comments = metrics.comments ?? 0;
  const quotes = metrics.quotes ?? 0;
  const saves = metrics.saves ?? 0;
  const shares = metrics.shares ?? 0;
  const views = metrics.views ?? 0;
  const completionRate = metrics.completionRate ?? 0;
  const goingCount = metrics.goingCount ?? 0;
  const followerCount = metrics.followerCount ?? 0;

  const base =
    likes * 3 +
    comments * 5 +
    quotes * 4 +
    saves * 6 +
    shares * 8 +
    views * 0.1 +
    completionRate * 50 +
    goingCount * 10 +
    followerCount * 2 +
    (metrics.isUrgent ? 20 : 0) +
    (metrics.isVerified ? 15 : 0);

  const ageHours = (Date.now() - new Date(metrics.createdAt).getTime()) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / Math.max(metrics.periodHours, 1)) * 50;

  return base + recencyBoost;
}
