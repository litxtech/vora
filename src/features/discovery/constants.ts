import type { DiscoveryPeriod, DiscoveryScope, DiscoveryTab } from '@/features/discovery/types';
import type { Ionicons } from '@expo/vector-icons';

export const DISCOVERY_PAGE_SIZE = 15;
export const DISCOVERY_FETCH_MULTIPLIER = 3;
export const DISCOVERY_USER_SEARCH_MIN_LENGTH = 2;
export const DISCOVERY_USER_SEARCH_LIMIT = 10;
export const DISCOVERY_USER_SUGGESTIONS_LIMIT = 10;
export const DISCOVERY_USER_SEARCH_PLACEHOLDER = 'İsim, e-posta veya kullanıcı adı ara…';

export const DISCOVERY_TABS: {
  id: DiscoveryTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'posts', label: 'Gönderiler', icon: 'flame-outline' },
  { id: 'reels', label: 'Reels', icon: 'play-circle-outline' },
  { id: 'news', label: 'Haberler', icon: 'newspaper-outline' },
  { id: 'events', label: 'Etkinlikler', icon: 'calendar-outline' },
  { id: 'businesses', label: 'İşletmeler', icon: 'storefront-outline' },
  { id: 'jobs', label: 'İş İlanları', icon: 'briefcase-outline' },
  { id: 'hotels', label: 'Oteller', icon: 'bed-outline' },
];

export const DISCOVERY_SCOPES: { id: DiscoveryScope; label: string }[] = [
  { id: 'region', label: 'İl Bazlı' },
  { id: 'karadeniz', label: 'Karadeniz Geneli' },
];

export const DISCOVERY_PERIODS: { id: DiscoveryPeriod; label: string; hours: number }[] = [
  { id: '24h', label: 'Son 24 Saat', hours: 24 },
  { id: '7d', label: 'Son 7 Gün', hours: 168 },
  { id: '30d', label: 'Son 30 Gün', hours: 720 },
];

export function periodStart(period: DiscoveryPeriod): string {
  const hours = DISCOVERY_PERIODS.find((p) => p.id === period)?.hours ?? 168;
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export function periodHours(period: DiscoveryPeriod): number {
  return DISCOVERY_PERIODS.find((p) => p.id === period)?.hours ?? 168;
}

export function parseOffsetCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const n = parseInt(cursor, 10);
  return Number.isFinite(n) ? n : 0;
}

export function trendRankLabel(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}
