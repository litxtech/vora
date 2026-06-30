import type { AnnouncementDraft } from '@/features/announcements/types';

/** Feed şeridinde gösterilecek maksimum duyuru sayısı. */
export const ANNOUNCEMENT_STRIP_LIMIT = 12;

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_BODY_MAX = 600;
export const ANNOUNCEMENT_LINK_LABEL_MAX = 28;

/** Şerit kartı boyutları (kompakt). */
export const ANNOUNCEMENT_CARD_WIDTH = 158;
export const ANNOUNCEMENT_CARD_HEIGHT = 104;

/** "Görünme süresi" hazır seçenekleri — null = süresiz. */
export const ANNOUNCEMENT_DURATIONS: { id: string; label: string; days: number | null }[] = [
  { id: '1d', label: '1 gün', days: 1 },
  { id: '3d', label: '3 gün', days: 3 },
  { id: '1w', label: '1 hafta', days: 7 },
  { id: '2w', label: '2 hafta', days: 14 },
  { id: '1m', label: '1 ay', days: 30 },
  { id: 'none', label: 'Süresiz', days: null },
];

/** Admin/işletme oluşturma ekranındaki vurgu rengi paleti. */
export const ANNOUNCEMENT_ACCENTS = [
  '#1E88E5',
  '#E85D5D',
  '#00897B',
  '#7B1FA2',
  '#F57C00',
  '#3949AB',
  '#43A047',
  '#D81B60',
] as const;

export const DEFAULT_ANNOUNCEMENT_ACCENT = ANNOUNCEMENT_ACCENTS[0];

/** Bir duyuruya eklenebilecek maksimum medya sayısı. */
export const ANNOUNCEMENT_MEDIA_MAX = 10;

export const EMPTY_ANNOUNCEMENT_DRAFT: AnnouncementDraft = {
  title: '',
  body: '',
  mediaType: 'none',
  mediaUrl: null,
  thumbnailUrl: null,
  localMediaUri: null,
  mediaItems: [],
  linkUrl: '',
  linkLabel: '',
  accent: DEFAULT_ANNOUNCEMENT_ACCENT,
  regionId: null,
  startsAt: null,
  endsAt: null,
  isPinned: false,
  priority: 0,
  isActive: true,
};
