export const STORY_PHOTO_DURATION_MS = 7_000;

export const STORY_MAX_VIDEO_SEC = 30;

/** false: hikâye halkası, yayınlama, arşiv ve ilgili rotalar gizlenir (kod kalır). */
export const STORIES_ENABLED = false;

export const STORY_TTL_HOURS = 24;

export const STORY_RING_PAGE_SIZE = 40;

/** İlk halka isteği — daha hızlı ilk boyama için daha küçük sayfa. */
export const STORY_RING_INITIAL_PAGE_SIZE = 24;

export const STORY_RING_AVATAR_SIZE = 68;

/** İzlenmemiş / aktif hikâye — uygulama mavisi + Karadeniz yeşili */
export const STORY_RING_ACTIVE_GRADIENT = ['#1E88E5', '#00BFA5', '#1565C0'] as const;

/** İzlenmiş hikâye halkası (açık/koyu tema üzerinde nötr) */
export const STORY_RING_SEEN_LIGHT = '#94A3B8';
export const STORY_RING_SEEN_DARK = '#4B5563';

export const STORY_USER_TRANSITION_MS = 320;

export const STORY_ITEM_TRANSITION_MS = 240;

/** Instagram tarzı yaylı snap / geçiş */
export const STORY_SPRING = { damping: 24, stiffness: 280, mass: 0.9 } as const;

/** Snapchat / Instagram tarzı kart — yumuşak oval köşeler */
export const STORY_CARD_RADIUS = 36;
export const STORY_CARD_HORIZONTAL_INSET = 14;
export const STORY_CARD_TOP_GAP = 10;
export const STORY_CARD_BOTTOM_GAP = 12;
/** Kamera önizlemesi — üst mod çubuğunun altından başlar */
export const STORY_CAPTURE_TOP_OFFSET = 92;
/** Kamera önizlemesi — alt shutter alanı */
export const STORY_CAPTURE_BOTTOM_OFFSET = 132;
/** Paylaşım önizlemesi — ekran kenarından nefes payı (izleyici inset’ten bağımsız) */
export const STORY_PUBLISH_HORIZONTAL_INSET = 22;
/** Sağ araç rayı — başlık altından daha aşağı (kart içeriğine kayar) */
export const STORY_PUBLISH_RAIL_TOP_EXTRA = 40;
export const STORY_PUBLISH_RAIL_RIGHT = 8;
/** Paylaşım ekranı alt şeridi — kartın büyümesini engeller */
export const STORY_PUBLISH_BOTTOM_CHROME_HEIGHT = 104;
export const STORY_CARD_BORDER_COLOR = 'rgba(255,255,255,0.16)';

export const STORY_STICKER_CATEGORIES = [
  { id: 'traffic', label: 'Trafik', icon: 'car-outline' as const },
  { id: 'event', label: 'Etkinlik', icon: 'calendar-outline' as const },
  { id: 'urgent', label: 'Acil', icon: 'alert-circle-outline' as const },
  { id: 'weather', label: 'Hava', icon: 'partly-sunny-outline' as const },
  { id: 'business', label: 'İşletme', icon: 'storefront-outline' as const },
] as const;

export type StoryStickerCategoryId = (typeof STORY_STICKER_CATEGORIES)[number]['id'];

export const STORY_ARCHIVE_PAGE_SIZE = 36;

export const STORY_ARCHIVE_ACCENT = '#EC407A';
