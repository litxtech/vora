import type { StudioTool } from '@/features/vora-studio/types';

export const VORA_STUDIO_VERSION = 1;

export const STUDIO_MAX_DURATION_SEC = 90;

/** Canlı destek video kırpma üst sınırı */
export const LIVE_SUPPORT_CLIP_MAX_SEC = 30;

/** Hikâye video kırpma üst sınırı (stories/constants ile uyumlu) */
export const STORY_CLIP_MAX_SEC = 30;

export const ORIGINAL_AUDIO_LEVELS = [
  { label: '100%', value: 1 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
  { label: '0%', value: 0 },
] as const;

export const PLAYBACK_SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
] as const;

export const MUSIC_CATEGORIES = [
  { id: 'trend', label: 'Trend' },
  { id: 'news', label: 'Haber' },
  { id: 'vlog', label: 'Vlog' },
  { id: 'karadeniz', label: 'Karadeniz' },
  { id: 'instrumental', label: 'Enstrümantal' },
] as const;

export type MusicCategoryId = (typeof MUSIC_CATEGORIES)[number]['id'];

export const TEXT_FONTS = [
  { id: 'system', label: 'Sistem' },
  { id: 'bold', label: 'Kalın' },
  { id: 'condensed', label: 'Dar' },
] as const;

export const TEXT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#FFD60A',
  '#34C759',
  '#0A84FF',
  '#BF5AF2',
  '#FF6B35',
] as const;

export const TEXT_ANIMATIONS = [
  { id: 'none', label: 'Yok' },
  { id: 'fade', label: 'Solma' },
  { id: 'slide', label: 'Kayma' },
  { id: 'pop', label: 'Patlama' },
] as const;

export const STUDIO_FILTERS = [
  { id: 'normal', label: 'Normal' },
  { id: 'vivid', label: 'Canlı' },
  { id: 'cinematic', label: 'Sinematik' },
  { id: 'cool', label: 'Soğuk' },
  { id: 'bw', label: 'Siyah Beyaz' },
] as const;

export const STUDIO_TOOLS: { id: StudioTool; label: string; icon: string; hint: string }[] = [
  { id: 'trim', label: 'Kırp', icon: 'cut-outline', hint: 'Beyaz tutamaçları sürükle · Çizgiye dokunarak konum seç' },
  { id: 'split', label: 'Kes', icon: 'git-branch-outline', hint: 'Oynatıcı konumunda videoyu böl' },
  { id: 'audio', label: 'Ses', icon: 'volume-medium-outline', hint: 'Orijinal video ses seviyesini ayarla' },
  { id: 'music', label: 'Müzik', icon: 'musical-notes-outline', hint: 'Telif güvenli arka plan müziği seç' },
  { id: 'voiceover', label: 'Seslendir', icon: 'mic-outline', hint: 'Kayda bas, video oynarken konuş' },
  { id: 'text', label: 'Yazı', icon: 'text-outline', hint: 'Metni videoda sürükle · Köşeden boyutlandır' },
  { id: 'thumbnail', label: 'Kapak', icon: 'image-outline', hint: 'Keşfette görünecek kapağı seç' },
  { id: 'subtitles', label: 'Altyazı', icon: 'chatbubble-ellipses-outline', hint: 'Konuşmayı otomatik yazıya çevir' },
];

/** v2 — filtreler şimdilik önizleme dışı */
export const STUDIO_V2_TOOLS = ['filters', 'stickers', 'speed'] as const;
