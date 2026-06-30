import type { FeedCategory } from '@/features/feed/types';
import type { UserRole } from '@/types/database';
import type { Ionicons } from '@expo/vector-icons';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';

export const FEED_PAGE_SIZE = 15;

export const FEED_ALL_REGIONS_LABEL = 'Tüm iller';
export const FEED_ALL_DISTRICTS_LABEL = 'Tüm ilçeler';

export function getFeedDistrictOptions(regionId: RegionId | null): string[] {
  if (regionId) return DISTRICTS[regionId] ?? [];

  const unique = new Set<string>();
  for (const districts of Object.values(DISTRICTS)) {
    for (const name of districts) unique.add(name);
  }
  return [...unique].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Akış kartında tam genişlik medya yüksekliği = genişlik × bu oran (4:5 ≈ 1.25) */
export const FEED_MEDIA_ASPECT_RATIO = 1.25;

/** Akış inline medya üst sınırı (px) */
export const FEED_MEDIA_MAX_HEIGHT = 420;

/** Gönderi detayında video kartı üst sınırı (px) */
export const FEED_DETAIL_VIDEO_MAX_HEIGHT = 560;

/** Dış paylaşım kartı genişliği (galeri / sosyal medya) */
export const POST_SHARE_CARD_WIDTH = 360;

export const FEED_FILTERS: {
  id: FeedCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline' },
  { id: 'news', label: 'Haberler', icon: 'newspaper-outline' },
  { id: 'emergency', label: 'Acil', icon: 'warning-outline' },
  { id: 'traffic', label: 'Trafik', icon: 'car-outline' },
  { id: 'event', label: 'Etkinlik', icon: 'calendar-outline' },
  { id: 'job', label: 'İş', icon: 'briefcase-outline' },
  { id: 'business', label: 'İşletme', icon: 'storefront-outline' },
  { id: 'lost_found', label: 'Kayıp', icon: 'search-outline' },
  { id: 'entertainment', label: 'Eğlence', icon: 'happy-outline' },
  { id: 'daily', label: 'Günlük', icon: 'sunny-outline' },
  { id: 'reels', label: 'Reels', icon: 'play-circle-outline' },
  { id: 'following', label: 'Takip', icon: 'people-outline' },
];

export const CATEGORY_STYLES: Record<
  string,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  news: { label: 'Haber', color: '#1E88E5', icon: 'newspaper-outline' },
  emergency: { label: 'Acil', color: '#EF5350', icon: 'warning-outline' },
  traffic: { label: 'Trafik', color: '#FFB300', icon: 'car-outline' },
  event: { label: 'Etkinlik', color: '#7B1FA2', icon: 'calendar-outline' },
  job: { label: 'İş İlanı', color: '#1E88E5', icon: 'briefcase-outline' },
  business: { label: 'İşletme', color: '#5C6BC0', icon: 'storefront-outline' },
  lost_found: { label: 'Kayıp', color: '#FF7043', icon: 'search-outline' },
  entertainment: { label: 'Eğlence', color: '#EC407A', icon: 'happy-outline' },
  daily: { label: 'Günlük', color: '#26A69A', icon: 'sunny-outline' },
  reels: { label: 'Reels', color: '#E91E63', icon: 'play-circle-outline' },
  general: { label: 'Genel', color: '#64748B', icon: 'chatbubble-outline' },
};

export { REPORT_REASONS } from '@/features/moderation/constants';

export const BADGE_CONFIG: Record<
  UserRole,
  { label: string; color: string; icon: string } | null
> = {
  user: null,
  verified_reporter: { label: 'Muhabir', color: '#1E88E5', icon: 'mic' },
  moderator: { label: 'Moderatör', color: '#7B1FA2', icon: 'shield-checkmark' },
  admin: { label: 'Admin', color: '#D32F2F', icon: 'star' },
  super_admin: { label: 'Admin', color: '#D32F2F', icon: 'star' },
};

export { DEMO_FEED_ITEMS } from '@/features/feed/constants/demoFeedItems';
