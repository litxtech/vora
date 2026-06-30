import type { ReelItem } from '@/features/reels/types';
import type { UserRole } from '@/types/database';

/** Bottom tab bar content height (icon + label), excluding home indicator inset. */
export const REELS_TAB_BAR_HEIGHT = 52;

/**
 * Aktif reel + 1 geri + 1 ileri mount edilir — kaydırma sırasında eşzamanlı
 * decoder yükünü sınırlar (ısınma). Daha ileri reel'ler gizli preload havuzunda
 * (MAX_WARM_PLAYERS) buffer'da bekler, mount edilmez.
 */
export const REELS_HOT_BEHIND = 1;
export const REELS_HOT_AHEAD = 1;

/** Thumbnail + manifest için ek ufukta kalan reel sayısı. */
export const REELS_PREFETCH_AHEAD = 5;

/**
 * Sıralı (yavaş) warmup kuyruğu prefetch penceresinden sonra en fazla kaç reel ısıtır.
 * Tüm feed'i kuyruğa almak yerine sınırlı tutar — uzun listelerde dakikalarca süren
 * arka plan HLS fetch + decode ısınmasını engeller. Kullanıcı kaydırdıkça pencere
 * yeni aktif indeksten yeniden hesaplanıp ileri reel'ler kademeli ısınır.
 */
export const REELS_SEQUENTIAL_MAX_AHEAD = 6;

/** Alttaki reel'ler sırayla arka planda ısınır (ms). */
export const REELS_SEQUENTIAL_WARMUP_MS = 60;

const DEMO_AUTHOR = {
  id: 'demo-reel-author',
  username: 'karadeniz_reels',
  fullName: 'Karadeniz Reels',
  avatarUrl: null,
  role: 'verified_reporter' as UserRole,
  isVerified: true,
};

/** Mux dokümantasyonundaki örnek public playback ID'leri — demo reel videoları için. */
const DEMO_MUX_PLAYBACK_IDS = [
  'uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW',
  'TXjw00EgPBPS6acv7gBUEJ14PEr5XNWOe',
] as const;

function demoThumbnail(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
}

export const DEMO_REELS: ReelItem[] = [
  {
    id: 'demo-reel-1',
    playbackId: DEMO_MUX_PLAYBACK_IDS[0],
    thumbnailUrl: demoThumbnail(DEMO_MUX_PLAYBACK_IDS[0]),
    caption: 'Trabzon Meydan akşam manzarası #Trabzon #Karadeniz',
    author: DEMO_AUTHOR,
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Trabzon Meydan',
    category: 'news',
    likeCount: 342,
    viewCount: 4200,
    shareCount: 45,
    saveCount: 89,
    completionRate: 0.72,
    commentCount: 28,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    isDemo: true,
  },
  {
    id: 'demo-reel-2',
    playbackId: DEMO_MUX_PLAYBACK_IDS[1],
    thumbnailUrl: demoThumbnail(DEMO_MUX_PLAYBACK_IDS[1]),
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
    shareCount: 22,
    saveCount: 41,
    completionRate: 0.65,
    commentCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    isLiked: false,
    isSaved: false,
    isFollowing: true,
    isDemo: true,
  },
];
