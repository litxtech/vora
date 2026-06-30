export const MUSIC_LIBRARY_BUCKET = 'music-library';

export const MUSIC_LIST_TABS = [
  { id: 'featured', label: 'En İyiler' },
  { id: 'recent', label: 'Son Kullanılanlar' },
  { id: 'trending', label: 'Trend' },
  { id: 'new', label: 'Yeni Eklenenler' },
] as const;

export type MusicListTabId = (typeof MUSIC_LIST_TABS)[number]['id'];

export const MUSIC_TREND_PERIODS = [
  { id: '24h', label: '24 Saat' },
  { id: '7d', label: '7 Gün' },
  { id: '30d', label: '30 Gün' },
] as const;

export type MusicTrendPeriod = (typeof MUSIC_TREND_PERIODS)[number]['id'];

export const MUSIC_LICENSE_STATUSES = [
  { id: 'licensed', label: 'Lisanslı', color: 'success' },
  { id: 'pending', label: 'Beklemede', color: 'warning' },
  { id: 'unlicensed', label: 'Lisanssız', color: 'danger' },
] as const;

export const MUSIC_PUBLICATION_STATUSES = [
  { id: 'active', label: 'Aktif' },
  { id: 'hidden', label: 'Gizli' },
  { id: 'blocked', label: 'Engelli' },
] as const;

export const MUSIC_VOLUME_PRESETS = [0, 0.25, 0.5, 0.75, 1] as const;

export const MUSIC_SEARCH_DEBOUNCE_MS = 100;

export const MUSIC_CACHE_TTL_MS = 5 * 60 * 1000;

export const MUSIC_PENDING_AUDIO_URL = 'pending';

export const MUSIC_ACCEPTED_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'ogg'] as const;

export const MUSIC_ACCEPTED_AUDIO_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
] as const;

export function isMusicTrackPlayable(audioUrl: string | null | undefined): boolean {
  if (!audioUrl) return false;
  if (audioUrl === MUSIC_PENDING_AUDIO_URL) return false;
  return audioUrl.startsWith('http');
}

export const MAX_MUSIC_DURATION_SEC = 600;

/** Fotoğraf gönderilerinde önizleme ve akışta çalınan müzik süresi */
export const PHOTO_POST_MUSIC_DURATION_SEC = 15;

/** Fotoğraf müziği kırpma — minimum seçilebilir süre */
export const MIN_PHOTO_MUSIC_CLIP_SEC = 3;
