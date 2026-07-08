import type { StudioTextOverlay, TextAnimation } from '@/features/vora-studio/types';

const MIN_FONT = 14;
const MAX_FONT = 72;

/** Story metin dokunma/pinch hassasiyet alanı (px) — görünmez, yalnızca jest için */
export const STORY_TEXT_HIT_PADDING = 28;

export function createStoryTextOverlay(
  partial?: Partial<StudioTextOverlay>,
  index = 0,
): StudioTextOverlay {
  const id = `story-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    text: '',
    x: 0.1,
    y: index > 0 ? 0.55 : 0.4,
    fontSize: 28,
    fontFamily: 'bold',
    color: '#FFFFFF',
    startSec: 0,
    endSec: 999,
    animation: 'none' satisfies TextAnimation,
    ...partial,
  };
}

export function clampStoryTextFontSize(size: number): number {
  return Math.round(Math.min(MAX_FONT, Math.max(MIN_FONT, size)));
}

export function parseStoryTextOverlays(raw: unknown): StudioTextOverlay[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.id !== 'string') return null;

      const text = typeof obj.text === 'string' ? obj.text : '';
      if (!text.trim()) return null;

      return {
        id: obj.id,
        text,
        x: typeof obj.x === 'number' ? obj.x : 0.1,
        y: typeof obj.y === 'number' ? obj.y : 0.4,
        fontSize: clampStoryTextFontSize(typeof obj.fontSize === 'number' ? obj.fontSize : 28),
        fontFamily: obj.fontFamily === 'regular' ? 'regular' : 'bold',
        color: typeof obj.color === 'string' ? obj.color : '#FFFFFF',
        startSec: 0,
        endSec: 999,
        animation: 'none' as TextAnimation,
      } satisfies StudioTextOverlay;
    })
    .filter((item): item is StudioTextOverlay => item != null);
}

export function serializeStoryTextOverlays(
  overlays: StudioTextOverlay[],
): StudioTextOverlay[] | undefined {
  const next = overlays
    .filter((item) => item.text.trim())
    .map((item) => ({
      id: item.id,
      text: item.text.trim(),
      x: item.x,
      y: item.y,
      fontSize: item.fontSize,
      fontFamily: item.fontFamily,
      color: item.color,
      startSec: 0,
      endSec: 999,
      animation: 'none' as TextAnimation,
    }));

  return next.length > 0 ? next : undefined;
}
