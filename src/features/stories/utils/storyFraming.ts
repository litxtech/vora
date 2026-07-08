import { Image } from 'react-native';
import { getVideoMetaData } from 'react-native-compressor';

const PROBE_TIMEOUT_MS = 4000;

export type StoryFraming = {
  /** 1 = kapak (cover), minZoom = tüm kare görünür */
  zoom: number;
  translateXNorm: number;
  translateYNorm: number;
  backgroundColor: string;
  mediaWidth: number;
  mediaHeight: number;
};

/** Otomatik çerçeveleme: kartı tam doldur (cover). */
export const STORY_AUTO_FRAME_ZOOM = 1;

export const DEFAULT_STORY_FRAMING: StoryFraming = {
  zoom: STORY_AUTO_FRAME_ZOOM,
  translateXNorm: 0,
  translateYNorm: 0,
  backgroundColor: '#000',
  mediaWidth: 1080,
  mediaHeight: 1920,
};

/** Tipik story kart en-boy oranı (dikey telefon önizlemesi) */
export const STORY_CARD_MEDIA_ASPECT = 9 / 16;

export const STORY_FRAMING_BACKGROUNDS = [
  '#000000',
  '#0a0a0a',
  '#1c1c1e',
  '#2c2c2e',
  '#3a3a3c',
  '#636366',
  '#ffffff',
  '#f2f2f7',
  '#e5e5ea',
  '#ff3b30',
  '#ff2d55',
  '#ff6b35',
  '#ff9500',
  '#ffcc00',
  '#ffd60a',
  '#34c759',
  '#30d158',
  '#00c7be',
  '#5ac8fa',
  '#007aff',
  '#5856d6',
  '#7c3aed',
  '#af52de',
  '#ff6b9d',
  '#e91e8c',
  '#8e6f53',
  '#a2845e',
  '#1a2e1a',
  '#1a1a2e',
  '#2e1a1a',
  '#1a2e2e',
] as const;

export function computeStoryFramingMetrics(
  mediaW: number,
  mediaH: number,
  containerW: number,
  containerH: number,
) {
  if (mediaW <= 0 || mediaH <= 0 || containerW <= 0 || containerH <= 0) {
    return {
      baseWidth: containerW,
      baseHeight: containerH,
      minZoom: 1,
      maxZoom: 4,
    };
  }

  const coverScale = Math.max(containerW / mediaW, containerH / mediaH);
  const containScale = Math.min(containerW / mediaW, containerH / mediaH);
  const baseWidth = mediaW * coverScale;
  const baseHeight = mediaH * coverScale;
  const minZoom = containScale / coverScale;

  return {
    baseWidth,
    baseHeight,
    minZoom: Math.min(1, minZoom),
    maxZoom: 4,
  };
}

/** Medyanın story kartına tam sığması için zoom (contain). */
export function computeStoryFitZoom(
  mediaW: number,
  mediaH: number,
  containerW: number,
  containerH: number,
): number {
  return computeStoryFramingMetrics(mediaW, mediaH, containerW, containerH).minZoom;
}

/** Yeni medya için varsayılan çerçeve: kartı cover ile doldurur (yuvarlak köşeler dahil). */
export function createStoryFramingForMedia(
  mediaWidth: number,
  mediaHeight: number,
  options?: { backgroundColor?: string },
): StoryFraming {
  return {
    zoom: STORY_AUTO_FRAME_ZOOM,
    translateXNorm: 0,
    translateYNorm: 0,
    backgroundColor: options?.backgroundColor ?? DEFAULT_STORY_FRAMING.backgroundColor,
    mediaWidth,
    mediaHeight,
  };
}

export function clampStoryFraming(
  framing: StoryFraming,
  baseWidth: number,
  baseHeight: number,
  containerWidth: number,
  containerHeight: number,
  minZoom: number,
  maxZoom: number,
): StoryFraming {
  const zoom = Math.min(maxZoom, Math.max(minZoom, framing.zoom));
  const scaledW = baseWidth * zoom;
  const scaledH = baseHeight * zoom;
  const maxX = Math.abs(scaledW - containerWidth) / 2;
  const maxY = Math.abs(scaledH - containerHeight) / 2;
  const translateX = framing.translateXNorm * containerWidth;
  const translateY = framing.translateYNorm * containerHeight;
  const clampedX = Math.min(maxX, Math.max(-maxX, translateX));
  const clampedY = Math.min(maxY, Math.max(-maxY, translateY));

  return {
    ...framing,
    zoom,
    translateXNorm: containerWidth > 0 ? clampedX / containerWidth : 0,
    translateYNorm: containerHeight > 0 ? clampedY / containerHeight : 0,
  };
}

export function storyFramingToPixels(
  framing: StoryFraming,
  containerWidth: number,
  containerHeight: number,
) {
  return {
    zoom: framing.zoom,
    translateX: framing.translateXNorm * containerWidth,
    translateY: framing.translateYNorm * containerHeight,
  };
}

export function parseStoryFraming(raw: unknown): StoryFraming | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const framing = obj.framing;
  if (!framing || typeof framing !== 'object') return null;
  const f = framing as Record<string, unknown>;
  if (typeof f.zoom !== 'number') return null;
  return {
    zoom: f.zoom,
    translateXNorm: typeof f.translateXNorm === 'number' ? f.translateXNorm : 0,
    translateYNorm: typeof f.translateYNorm === 'number' ? f.translateYNorm : 0,
    backgroundColor: typeof f.backgroundColor === 'string' ? f.backgroundColor : DEFAULT_STORY_FRAMING.backgroundColor,
    mediaWidth: typeof f.mediaWidth === 'number' ? f.mediaWidth : DEFAULT_STORY_FRAMING.mediaWidth,
    mediaHeight: typeof f.mediaHeight === 'number' ? f.mediaHeight : DEFAULT_STORY_FRAMING.mediaHeight,
  };
}

export function serializeStoryFraming(framing: StoryFraming): Record<string, unknown> {
  return { framing };
}

export function probeImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Image probe timeout'));
    }, PROBE_TIMEOUT_MS);

    Image.getSize(
      uri,
      (width, height) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ width, height });
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function probeVideoSize(uri: string): Promise<{ width: number; height: number }> {
  try {
    const meta = await Promise.race([
      getVideoMetaData(uri),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
      }),
    ]);
    if (meta?.width && meta?.height) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    /* fallback */
  }
  return { width: 1080, height: 1920 };
}
