import type { Ionicons } from '@expo/vector-icons';
import type { NotificationCategoryId, PushPrefId } from '@/constants/notifications';

export const CATEGORY_TAB_ICONS: Record<NotificationCategoryId, string> = {
  all: 'apps-outline',
  social: 'people-outline',
  messages: 'chatbubbles-outline',
  jobs: 'briefcase-outline',
  businesses: 'storefront-outline',
  emergency: 'warning-outline',
  system: 'settings-outline',
};

export const PRIORITY_COLORS = {
  low: '#78909C',
  normal: '#42A5F5',
  high: '#FB8C00',
  critical: '#D32F2F',
} as const;

export const EMERGENCY_ACCENT = '#B71C1C';

export const SETTINGS_FILTER_TABS = [
  { id: 'all', label: 'Tümü', icon: 'apps-outline' },
  { id: 'social', label: 'Sosyal', icon: 'people-outline' },
  { id: 'messages', label: 'Mesajlar', icon: 'chatbubbles-outline' },
  { id: 'businesses', label: 'İşletmeler', icon: 'storefront-outline' },
  { id: 'emergency', label: 'Acil', icon: 'warning-outline' },
  { id: 'jobs', label: 'İş', icon: 'briefcase-outline' },
  { id: 'system', label: 'Sistem', icon: 'settings-outline' },
] as const;

export type SettingsFilterTabId = (typeof SETTINGS_FILTER_TABS)[number]['id'];

export const PUSH_PREF_CATEGORY: Record<PushPrefId, SettingsFilterTabId> = {
  likes: 'social',
  comments: 'social',
  follows: 'social',
  friend_requests: 'social',
  mentions: 'social',
  feed: 'social',
  messages: 'messages',
  channels: 'businesses',
  businesses: 'businesses',
  hotels: 'businesses',
  nearby_events: 'emergency',
  emergency: 'emergency',
  jobs: 'jobs',
  marketplace: 'jobs',
  rides: 'jobs',
  vora_needs: 'jobs',
  vora_hizmetler: 'jobs',
  system: 'system',
};

export const PUSH_PREF_ICONS: Record<PushPrefId, keyof typeof Ionicons.glyphMap> = {
  likes: 'heart-outline',
  comments: 'chatbubble-ellipses-outline',
  follows: 'person-add-outline',
  friend_requests: 'people-outline',
  messages: 'chatbubbles-outline',
  mentions: 'at-outline',
  feed: 'pulse-outline',
  channels: 'megaphone-outline',
  businesses: 'storefront-outline',
  nearby_events: 'location-outline',
  emergency: 'alert-circle-outline',
  jobs: 'briefcase-outline',
  marketplace: 'storefront-outline',
  rides: 'car-outline',
  vora_needs: 'hand-left-outline',
  vora_hizmetler: 'construct-outline',
  hotels: 'bed-outline',
  system: 'information-circle-outline',
};

export const REGIONAL_PREF_ICONS = {
  notifyEmergency: 'megaphone-outline',
  notifyIncidents: 'flash-outline',
  notifyEvents: 'calendar-outline',
  notifyJobs: 'id-card-outline',
} as const satisfies Record<string, keyof typeof Ionicons.glyphMap>;
