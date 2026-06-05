import type { ReelItem } from '@/features/reels/types';
import type { UserRole } from '@/types/database';

const DEMO_AUTHOR = {
  id: 'demo-reel-author',
  username: 'karadeniz_reels',
  fullName: 'Karadeniz Reels',
  avatarUrl: null,
  role: 'verified_reporter' as UserRole,
  isVerified: true,
};

export const DEMO_REELS: ReelItem[] = [
  {
    id: 'demo-reel-1',
    playbackId: null,
    thumbnailUrl: null,
    caption: 'Trabzon Meydan akşam manzarası #Trabzon #Karadeniz',
    author: DEMO_AUTHOR,
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Trabzon Meydan',
    category: 'news',
    likeCount: 342,
    viewCount: 4200,
    commentCount: 28,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isLiked: false,
    isFollowing: false,
    isDemo: true,
  },
  {
    id: 'demo-reel-2',
    playbackId: null,
    thumbnailUrl: null,
    caption: 'Yomra sahilinde gün batımı 🌅',
    author: {
      ...DEMO_AUTHOR,
      id: 'demo-reel-author-2',
      username: 'yomra_gundem',
      fullName: 'Yomra Gündem',
      role: 'user',
      isVerified: false,
    },
    regionId: 'trabzon',
    district: 'Yomra',
    locationLabel: 'Yomra Sahil',
    category: 'event',
    likeCount: 189,
    viewCount: 2100,
    commentCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    isLiked: false,
    isFollowing: true,
    isDemo: true,
  },
];
