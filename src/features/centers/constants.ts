import type { CenterGroup, CenterId } from '@/features/centers/types';

/** Merkezler hub'ında öne çıkarılan kartlar — varsayılan; canlı liste app_appearance üzerinden yönetilir */
export const DEFAULT_FEATURED_CENTER_IDS: CenterId[] = ['marketplace', 'rides'];

export const CENTER_GROUP_META: Record<
  CenterGroup,
  { icon: string; accent: string; description: string }
> = {
  community: {
    icon: 'people',
    accent: '#E91E63',
    description: 'Etkinlik, destek ve kayıp',
  },
  map: {
    icon: 'map',
    accent: '#00897B',
    description: 'Konum ve harita',
  },
  economy: {
    icon: 'wallet',
    accent: '#FF9800',
    description: 'Al-sat, iş ilanları ve yolculuk',
  },
  media: {
    icon: 'play-circle',
    accent: '#7B1FA2',
    description: 'Medya ve içerik',
  },
  social: {
    icon: 'heart',
    accent: '#EC407A',
    description: 'Yardım ve ihtiyaç ağı',
  },
};
