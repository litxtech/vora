export const STORY_PHOTO_DURATION_MS = 7_000;

export const STORY_MAX_VIDEO_SEC = 30;

export const STORY_TTL_HOURS = 24;

export const STORY_RING_PAGE_SIZE = 40;

export const STORY_RING_AVATAR_SIZE = 68;

/** İzlenmemiş / aktif hikâye — uygulama mavisi + Karadeniz yeşili */
export const STORY_RING_ACTIVE_GRADIENT = ['#1E88E5', '#00BFA5', '#1565C0'] as const;

/** İzlenmiş hikâye halkası (açık/koyu tema üzerinde nötr) */
export const STORY_RING_SEEN_LIGHT = '#94A3B8';
export const STORY_RING_SEEN_DARK = '#4B5563';

export const STORY_USER_TRANSITION_MS = 220;

/** Snapchat tarzı kart — kenar boşlukları ve yuvarlak köşe */
export const STORY_CARD_RADIUS = 22;
export const STORY_CARD_HORIZONTAL_INSET = 12;
export const STORY_CARD_TOP_GAP = 10;
export const STORY_CARD_BOTTOM_GAP = 12;

export const STORY_STICKER_CATEGORIES = [
  { id: 'traffic', label: 'Trafik', icon: 'car-outline' as const },
  { id: 'event', label: 'Etkinlik', icon: 'calendar-outline' as const },
  { id: 'urgent', label: 'Acil', icon: 'alert-circle-outline' as const },
  { id: 'weather', label: 'Hava', icon: 'partly-sunny-outline' as const },
  { id: 'business', label: 'İşletme', icon: 'storefront-outline' as const },
] as const;

export type StoryStickerCategoryId = (typeof STORY_STICKER_CATEGORIES)[number]['id'];
