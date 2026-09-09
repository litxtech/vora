import type {
  CapOverlayStyle,
  CapPickerTabId,
  CapsCenterTabId,
  CapsDiscoverSort,
  CapsStudioClipLengthSec,
} from '@/features/caps/types';

export const CAPS_BUCKET = 'caps';
export const MAX_CAPS_PER_USER = 50;
export const MAX_CAP_UPLOAD_BYTES = 8 * 1024 * 1024;
export const CAP_IMAGE_MAX_SIZE = 512;
export const CAP_DISPLAY_SIZE = 220;
export const CAP_CREATOR_AVATAR_SIZE = 18;

/** Varsayılan caps aralığı (saniye). */
export const CAP_DEFAULT_CLIP_SEC: CapsStudioClipLengthSec = 5;
export const CAP_CLIP_LENGTH_OPTIONS: CapsStudioClipLengthSec[] = [3, 5, 10];
export const CAP_VIDEO_DURATION_SEC = CAP_DEFAULT_CLIP_SEC;
/** Üst sınır (ms) — 10 sn + encode sapması. */
export const CAP_VIDEO_MAX_DURATION_MS = 10500;

export const CAPS_STUDIO_TITLE = 'Vora Caps Studio';
export const CAPS_CENTER_TITLE = 'Caps Merkezi';
export const CAPS_CENTER_SUBTITLE =
  'Fotoğraf, video veya Vora videosundan caps üret — kesmeden paylaş.';

export const CAP_JUMP_STEPS_SEC = [10, 30, 60, 300, 600] as const;

export const CAP_OVERLAY_FONTS = [
  { id: 'system', label: 'Aa' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
  { id: 'rounded', label: 'Yuvarlak' },
] as const;

export const CAP_OVERLAY_COLORS = [
  '#FFFFFF',
  '#000000',
  '#F43F5E',
  '#0EA5E9',
  '#FBBF24',
  '#22C55E',
  '#A855F7',
] as const;

export const CAP_PICKER_TABS: { id: CapPickerTabId; label: string }[] = [
  { id: 'library', label: 'Kütüphanem' },
  { id: 'market', label: 'Market' },
  { id: 'mine', label: 'Ürettiklerim' },
];

export const CAPS_CENTER_TABS: {
  id: CapsCenterTabId;
  label: string;
  icon: string;
}[] = [
  { id: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'library', label: 'Kütüphane', icon: 'albums-outline' },
  { id: 'mine', label: 'Ürettiklerim', icon: 'color-wand-outline' },
  { id: 'creators', label: 'Sıralama', icon: 'trophy-outline' },
];

export const CAPS_DISCOVER_SORTS: { id: CapsDiscoverSort; label: string }[] = [
  { id: 'trending', label: 'Trend' },
  { id: 'new', label: 'Yeni' },
  { id: 'popular', label: 'Popüler' },
];

export function formatCapUsageCount(count: number): string {
  if (count <= 0) return 'Henüz kullanılmadı';
  if (count === 1) return '1 kişi kullandı';
  return `${count} kişi kullandı`;
}

export function formatCapClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isCapMessageMetadata(
  value: unknown,
): value is {
  kind: 'cap';
  capId: string;
  imageUrl: string;
  videoUrl: string | null;
  thumbUrl: string | null;
  width?: number | null;
  height?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
} {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.kind === 'cap' && typeof row.capId === 'string' && typeof row.creatorId === 'string';
}
