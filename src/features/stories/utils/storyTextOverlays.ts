import type { StudioTextOverlay, TextAnimation } from '@/features/vora-studio/types';

const MIN_FONT = 14;
const MAX_FONT = 72;

/** Story metin dokunma alanı (px) */
export const STORY_TEXT_HIT_PADDING = 28;

/** Seçili metinde pinch yakalama alanı — iki parmak metin üzerindeyken */
export const STORY_TEXT_PINCH_PADDING = 80;

/** Story metin konumu — çerçeve içinde kalır */
export const STORY_TEXT_BOUNDS = {
  minX: 0.04,
  maxX: 0.92,
  minY: 0.06,
  maxY: 0.8,
  centerMinX: 0.14,
  centerMaxX: 0.86,
  centerMinY: 0.12,
  centerMaxY: 0.72,
} as const;

export function clampStoryTextPosition(
  x: number,
  y: number,
  anchor: 'topLeft' | 'center' = 'topLeft',
): { x: number; y: number } {
  if (anchor === 'center') {
    return {
      x: Math.min(Math.max(x, STORY_TEXT_BOUNDS.centerMinX), STORY_TEXT_BOUNDS.centerMaxX),
      y: Math.min(Math.max(y, STORY_TEXT_BOUNDS.centerMinY), STORY_TEXT_BOUNDS.centerMaxY),
    };
  }
  return {
    x: Math.min(Math.max(x, STORY_TEXT_BOUNDS.minX), STORY_TEXT_BOUNDS.maxX),
    y: Math.min(Math.max(y, STORY_TEXT_BOUNDS.minY), STORY_TEXT_BOUNDS.maxY),
  };
}

export function createStoryTextOverlay(
  partial?: Partial<StudioTextOverlay>,
  index = 0,
): StudioTextOverlay {
  const id = `story-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    text: '',
    /** (1 - maxWidth) / 2 — metin bloğu yatayda ortada başlar */
    x: 0.06,
    y: index > 0 ? 0.56 : 0.4,
    anchor: 'topLeft',
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
        x: typeof obj.x === 'number' ? obj.x : 0.5,
        y: typeof obj.y === 'number' ? obj.y : 0.44,
        anchor: obj.anchor === 'topLeft' ? 'topLeft' : 'center',
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
      anchor: item.anchor,
      fontSize: item.fontSize,
      fontFamily: item.fontFamily,
      color: item.color,
      startSec: 0,
      endSec: 999,
      animation: 'none' as TextAnimation,
    }));

  return next.length > 0 ? next : undefined;
}
