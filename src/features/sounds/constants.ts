import type { SoundListTabId, SoundReportReason } from '@/features/sounds/types';

export const SOUNDS_BUCKET = 'user-sounds';

export const MAX_SOUND_DURATION_SEC = 60;
export const MIN_SOUND_DURATION_SEC = 1;

export const SOUND_LIST_TABS: { id: SoundListTabId; label: string }[] = [
  { id: 'trending', label: 'Trend Sesler' },
  { id: 'new', label: 'Yeni Sesler' },
  { id: 'following', label: 'Takip Ettiklerim' },
  { id: 'saved', label: 'Kaydettiklerim' },
  { id: 'mine', label: 'Benim Seslerim' },
];

export const SOUND_BADGE_TIERS = [
  { threshold: 100, label: '100 Kullanım Rozeti', icon: 'ribbon-outline' as const },
  { threshold: 500, label: '500 Kullanım · Ekstra Puan', icon: 'star-outline' as const },
  { threshold: 1000, label: 'Trend Etiketi', icon: 'flame-outline' as const },
  { threshold: 10000, label: 'Popüler Ses', icon: 'trophy-outline' as const },
] as const;

export const SOUND_REPORT_REASONS: { id: SoundReportReason; label: string }[] = [
  { id: 'copyright', label: 'Telif Bildir' },
  { id: 'inappropriate', label: 'Uygunsuz İçerik' },
  { id: 'spam', label: 'Spam' },
  { id: 'misleading_title', label: 'Yanıltıcı Başlık' },
];

export const SOUND_CACHE_TTL_MS = 5 * 60 * 1000;
export const SOUND_SEARCH_DEBOUNCE_MS = 200;

export const SOUND_ACCEPTED_AUDIO_MIME = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
] as const;

export function defaultSoundTitle(username: string): string {
  return `Orijinal Ses - @${username}`;
}

export function isSoundPlayable(audioUrl: string | null | undefined): boolean {
  if (!audioUrl) return false;
  return audioUrl.startsWith('http');
}

export function soundBadgeLabel(tier: number): string | null {
  const match = [...SOUND_BADGE_TIERS].reverse().find((b) => tier >= b.threshold);
  return match?.label ?? null;
}
