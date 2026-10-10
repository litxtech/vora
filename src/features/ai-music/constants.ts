import type { AiMusicStyle, AiMusicVocal } from '@/features/ai-music/types';

export const AI_MUSIC_STYLES: { id: AiMusicStyle; label: string }[] = [
  { id: 'serbest', label: 'Tarif' },
  { id: 'karma', label: 'Kaval & Kemençe' },
  { id: 'kemence', label: 'Kemençe' },
  { id: 'kaval', label: 'Kaval' },
  { id: 'horon', label: 'Horon' },
  { id: 'tulum', label: 'Tulum' },
];

export const AI_MUSIC_VOCALS: { id: AiMusicVocal; label: string; hint: string }[] = [
  { id: 'instrumental', label: 'Yalnız müzik', hint: 'Söz ve ses yok' },
  { id: 'female', label: 'Kadın ses', hint: 'Sözleri seslendirir' },
  { id: 'male', label: 'Erkek ses', hint: 'Sözleri seslendirir' },
];

export const AI_MUSIC_STAGES: { id: string; label: string }[] = [
  { id: 'queued', label: 'İstek alındı' },
  { id: 'listening', label: 'Referans dinleniyor' },
  { id: 'composing', label: 'Beste kuruluyor' },
  { id: 'rendering', label: 'Ses üretiliyor' },
  { id: 'saving', label: 'Kayda geçiyor' },
  { id: 'ready', label: 'Hazır' },
];

export const AI_MUSIC_MIN_SEC = 10;
/** Kullanıcının söylediği referans kaydının üst sınırı. */
export const AI_MUSIC_VOICE_MAX_SEC = 60;
export const AI_MUSIC_MAX_SEC = 180;
export const AI_MUSIC_DAILY_LIMIT = 20;
export const AI_MUSIC_FREE_SEC = 10 * 60;
export const AI_MUSIC_TAG = 'ai-muzik';

export const AI_MUSIC_PACKAGES = [
  { id: 'm15', minutes: 15, seconds: 15 * 60, priceTry: 159, label: '15 dakika' },
  { id: 'm30', minutes: 30, seconds: 30 * 60, priceTry: 349, label: '30 dakika' },
  { id: 'm60', minutes: 60, seconds: 60 * 60, priceTry: 999, label: '60 dakika' },
] as const;

export type AiMusicPackageId = (typeof AI_MUSIC_PACKAGES)[number]['id'];

export function aiMusicStyleLabel(style: string): string {
  return AI_MUSIC_STYLES.find((item) => item.id === style)?.label ?? 'Tarif';
}

export function aiMusicStageLabel(stage: string): string {
  return AI_MUSIC_STAGES.find((item) => item.id === stage)?.label ?? 'Müzik hazırlanıyor';
}

export function formatAiMusicAllowance(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes === 0) return `${seconds} sn`;
  if (seconds === 0) return `${minutes} dk`;
  return `${minutes} dk ${seconds} sn`;
}

export function formatAiMusicClock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function aiMusicShareMessage(input: {
  title: string;
  rightsNotice: string;
  soundId?: string | null;
}): string {
  const link = input.soundId ? `\nhttps://vora.app/sounds/${input.soundId}` : '';
  return `${input.title}\n\n${input.rightsNotice}${link}`;
}
