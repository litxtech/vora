import type { ChannelType } from '@/features/channels/types';
import type { Ionicons } from '@expo/vector-icons';

export const CHANNEL_TYPES: {
  id: ChannelType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: 'news', label: 'Haber Kanalı', icon: 'newspaper-outline', color: '#1E88E5' },
  { id: 'municipality', label: 'Belediye Kanalı', icon: 'business-outline', color: '#5C6BC0' },
  { id: 'emergency', label: 'Acil Durum Kanalı', icon: 'warning-outline', color: '#EF5350' },
  { id: 'business', label: 'İşletme Kanalı', icon: 'storefront-outline', color: '#00BFA5' },
];

export const DEMO_CHANNELS = [
  {
    name: 'Karadeniz Haber',
    slug: 'karadeniz-haber',
    description: 'Bölgesel haberler ve son dakika gelişmeleri.',
    channelType: 'news' as const,
    regionId: null,
    isVerified: true,
  },
  {
    name: 'Trabzon Büyükşehir',
    slug: 'trabzon-belediye',
    description: 'Resmi belediye duyuruları ve etkinlikler.',
    channelType: 'municipality' as const,
    regionId: 'trabzon',
    isVerified: true,
  },
  {
    name: 'Acil Durum Trabzon',
    slug: 'acil-trabzon',
    description: 'Deprem, sel, yangın ve acil uyarılar.',
    channelType: 'emergency' as const,
    regionId: 'trabzon',
    isVerified: true,
  },
];

export function channelTypeMeta(type: ChannelType) {
  return CHANNEL_TYPES.find((t) => t.id === type) ?? CHANNEL_TYPES[0];
}

export function channelDetailPath(id: string): string {
  return `/channels/${id}`;
}
