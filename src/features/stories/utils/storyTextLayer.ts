import type { StudioTextOverlay, TextAnimation } from '@/features/vora-studio/types';
import type {
  StoryTextAlign,
  StoryTextBackground,
  StoryTextStyleId,
} from '@/features/vora-studio/types';

export const STORY_TEXT_MIN_SCALE = 0.35;
export const STORY_TEXT_MAX_SCALE = 4;
export const STORY_TEXT_MIN_FONT = 14;
export const STORY_TEXT_MAX_FONT = 72;

const STORY_TEXT_DEFAULT_Y = 0.42;

/** Story metin konumu — çerçeve içinde kalır (merkez anchor) */
export const STORY_TEXT_BOUNDS = {
  minX: 0.08,
  maxX: 0.92,
  minY: 0.08,
  maxY: 0.88,
} as const;

export function clampStoryTextPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, STORY_TEXT_BOUNDS.minX), STORY_TEXT_BOUNDS.maxX),
    y: Math.min(Math.max(y, STORY_TEXT_BOUNDS.minY), STORY_TEXT_BOUNDS.maxY),
  };
}

export function clampStoryTextScale(scale: number): number {
  return Math.min(STORY_TEXT_MAX_SCALE, Math.max(STORY_TEXT_MIN_SCALE, scale));
}

function normalizeRotationDeg(deg: number): number {
  let next = deg % 360;
  if (next > 180) next -= 360;
  if (next < -180) next += 360;
  return next;
}

function clampStoryTextFontSize(size: number): number {
  return Math.round(Math.min(STORY_TEXT_MAX_FONT, Math.max(STORY_TEXT_MIN_FONT, size)));
}

function parseStoryTextStyleId(raw: unknown): StoryTextStyleId {
  const ids: StoryTextStyleId[] = [
    'modern',
    'classic',
    'neon',
    'typewriter',
    'strong',
    'script',
  ];
  return ids.includes(raw as StoryTextStyleId) ? (raw as StoryTextStyleId) : 'modern';
}

function parseStoryTextBackground(raw: unknown): StoryTextBackground {
  const values: StoryTextBackground[] = ['none', 'semi', 'solid'];
  return values.includes(raw as StoryTextBackground) ? (raw as StoryTextBackground) : 'none';
}

function parseStoryTextAlign(raw: unknown): StoryTextAlign {
  const values: StoryTextAlign[] = ['left', 'center', 'right'];
  return values.includes(raw as StoryTextAlign) ? (raw as StoryTextAlign) : 'center';
}

/** Eski hikâyelerdeki metin katmanlarını okur */
export function parseStoryTextOverlays(raw: unknown): StudioTextOverlay[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.id !== 'string') return null;

      const text = typeof obj.text === 'string' ? obj.text : '';
      if (!text.trim()) return null;

      const fontFamily = obj.fontFamily === 'regular' ? 'regular' : 'bold';
      const textStyle = obj.textStyle
        ? parseStoryTextStyleId(obj.textStyle)
        : fontFamily === 'regular'
          ? 'classic'
          : 'modern';

      const anchor = obj.anchor === 'topLeft' ? 'topLeft' : 'center';

      return {
        id: obj.id,
        text,
        x: typeof obj.x === 'number' ? obj.x : anchor === 'center' ? 0.5 : 0.12,
        y: typeof obj.y === 'number' ? obj.y : anchor === 'center' ? STORY_TEXT_DEFAULT_Y : 0.42,
        anchor,
        fontSize: clampStoryTextFontSize(typeof obj.fontSize === 'number' ? obj.fontSize : 32),
        scale: clampStoryTextScale(typeof obj.scale === 'number' ? obj.scale : 1),
        rotationDeg: normalizeRotationDeg(
          typeof obj.rotationDeg === 'number' ? obj.rotationDeg : 0,
        ),
        fontFamily,
        textStyle,
        background: parseStoryTextBackground(obj.background),
        textAlign: parseStoryTextAlign(obj.textAlign),
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
      anchor: item.anchor ?? 'center',
      fontSize: item.fontSize,
      scale: clampStoryTextScale(item.scale ?? 1),
      rotationDeg: normalizeRotationDeg(item.rotationDeg ?? 0),
      fontFamily: item.fontFamily,
      textStyle: item.textStyle,
      background: item.background,
      textAlign: item.textAlign,
      color: item.color,
      startSec: 0,
      endSec: 999,
      animation: 'none' as TextAnimation,
    }));

  return next.length > 0 ? next : undefined;
}
