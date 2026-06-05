export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const MIN_AGE = 18;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

export const BANNED_WORDS = [
  'admin',
  'moderator',
  'sistem',
  'root',
  'karadeniz',
  'amk',
  'sik',
  'orospu',
  'piç',
  'göt',
];

export const INTEREST_OPTIONS = [
  { id: 'news', label: 'Haberler' },
  { id: 'traffic', label: 'Trafik' },
  { id: 'jobs', label: 'İş İlanları' },
  { id: 'events', label: 'Etkinlikler' },
  { id: 'businesses', label: 'İşletmeler' },
  { id: 'sports', label: 'Spor' },
  { id: 'tourism', label: 'Turizm' },
  { id: 'lost_found', label: 'Kayıp İlanları' },
] as const;

export type InterestId = (typeof INTEREST_OPTIONS)[number]['id'];

export const NOTIFICATION_OPTIONS = [
  { id: 'likes', label: 'Beğeniler', description: 'Gönderi ve reel beğenileri, alıntılar' },
  { id: 'comments', label: 'Yorumlar', description: 'Paylaşımlarınıza gelen yorumlar' },
  { id: 'follows', label: 'Takip', description: 'Yeni takipçi bildirimleri' },
  { id: 'friend_requests', label: 'Arkadaşlık', description: 'Arkadaşlık istekleri ve kabul' },
  { id: 'messages', label: 'Mesajlar', description: 'Yeni mesaj ve arama bildirimleri' },
  { id: 'mentions', label: 'Bahsetmeler', description: 'Sizi etiketleyen paylaşımlar' },
  { id: 'nearby_events', label: 'Yakınındaki olaylar', description: 'Bölgenizdeki önemli gelişmeler' },
  { id: 'emergency', label: 'Acil durum bildirimleri', description: 'Kritik ve acil uyarılar' },
  { id: 'jobs', label: 'İş ilanları', description: 'Size uygun yeni iş fırsatları' },
] as const;

export type NotificationPrefId = (typeof NOTIFICATION_OPTIONS)[number]['id'];

export const LOBBY_STATS_FALLBACK = {
  activeUsers: 12842,
  livePosts: 421,
  jobListings: 38,
  events: 14,
} as const;
