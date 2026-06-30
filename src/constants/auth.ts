import { PUSH_PREF_OPTIONS, type PushPrefId } from '@/constants/notifications';

export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 30;
/** Harf, rakam, alt çizgi, nokta ve tire; diğer özel karakterler yasak. */
export const USERNAME_FORMAT_REGEX = /^[a-z0-9_.-]+$/;
export const USERNAME_FORMAT_HINT = 'harf, rakam, alt çizgi, nokta ve tire';
export const PASSWORD_MIN_LENGTH = 8;
export const MIN_AGE = 18;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

/** Oturum yalnızca bu nedenlerle sonlanır: manual | ban | deletion | frozen */
export const SESSION_END_REASONS = ['manual', 'ban', 'deletion', 'frozen'] as const;

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

/** Kayıt ve profil tercihleri — ayarlar ekranıyla aynı anahtar seti. */
export const NOTIFICATION_OPTIONS = PUSH_PREF_OPTIONS;

export type NotificationPrefId = PushPrefId;
