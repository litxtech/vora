export const STORY_PHOTO_DURATION_MS = 7_000;

export const STORY_MAX_VIDEO_SEC = 30;

export const STORY_TTL_HOURS = 24;

export const STORY_RING_PAGE_SIZE = 40;

export const STORY_RING_AVATAR_SIZE = 68;

export const STORY_USER_TRANSITION_MS = 220;

export const STORY_STICKER_CATEGORIES = [
  { id: 'traffic', label: 'Trafik', icon: 'car-outline' as const },
  { id: 'event', label: 'Etkinlik', icon: 'calendar-outline' as const },
  { id: 'urgent', label: 'Acil', icon: 'alert-circle-outline' as const },
  { id: 'weather', label: 'Hava', icon: 'partly-sunny-outline' as const },
  { id: 'business', label: 'İşletme', icon: 'storefront-outline' as const },
] as const;

export type StoryStickerCategoryId = (typeof STORY_STICKER_CATEGORIES)[number]['id'];
