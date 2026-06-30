import type { Ionicons } from '@expo/vector-icons';

export const LEADERBOARD_TITLE = 'Liderlik Tablosu';
export const LEADERBOARD_SUBTITLE = 'Platform genelinde en iyi performans gösteren kullanıcılar';

export const LEADERBOARD_LIMIT = 50;

export const LEADERBOARD_METRICS = [
  {
    id: 'trust',
    label: 'Güven Puanı',
    valueHint: 'puan',
    icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'contribution',
    label: 'Katkı Puanı',
    valueHint: 'puan',
    icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'followers',
    label: 'Takipçi',
    valueHint: 'takipçi',
    icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'engagement',
    label: 'Etkileşim',
    valueHint: 'etkileşim',
    icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'screen_time',
    label: 'Ekran Süresi',
    valueHint: 'uygulamada',
    icon: 'hourglass-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'badges',
    label: 'Rozetler',
    valueHint: 'güven puanı',
    icon: 'ribbon-outline' as keyof typeof Ionicons.glyphMap,
  },
] as const;

export const LEADERBOARD_BADGE_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pioneer', label: 'Öncü' },
  { id: 'platform_charm', label: 'Vora İkonu' },
] as const;

export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number]['id'];
export type LeaderboardBadgeFilter = (typeof LEADERBOARD_BADGE_FILTERS)[number]['id'];

export function leaderboardMetricLabel(metric: LeaderboardMetric): string {
  return LEADERBOARD_METRICS.find((item) => item.id === metric)?.label ?? metric;
}

export function leaderboardValueHint(metric: LeaderboardMetric): string {
  return LEADERBOARD_METRICS.find((item) => item.id === metric)?.valueHint ?? '';
}

/** Liderlikte "Ekran Süresi" değeri dakikadır; "3sa 12dk" / "45dk" gibi biçimler. */
export function formatLeaderboardMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours > 0) return `${hours}sa ${minutes}dk`;
  return `${minutes}dk`;
}
