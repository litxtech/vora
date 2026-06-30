import { Image } from 'expo-image';
import { getMuxPlaybackUrl } from '@/lib/mux/client';
import { getReelSequentialWarmupMs, getReelWarmupBatchSize } from '@/lib/device/androidPerfProfile';
import { prefetchReelMusic } from '@/features/music/services/reelMusicSync';
import { getReelHotWindow, getReelPrefetchWindow } from '@/features/reels/services/reelWindow';
import { scheduleReelVideoPreload, primeReelVideoPreload } from '@/features/reels/services/reelVideoPreload';
import { REELS_SEQUENTIAL_MAX_AHEAD, REELS_SEQUENTIAL_WARMUP_MS } from '@/features/reels/constants';
import type { ReelItem } from '@/features/reels/types';

const warmedAssetIds = new Set<string>();
let sequentialTimer: ReturnType<typeof setTimeout> | null = null;
let sequentialGeneration = 0;
let sequentialCursor = 0;
let sequentialItems: ReelItem[] = [];

function clearSequentialTimer() {
  if (sequentialTimer) {
    clearTimeout(sequentialTimer);
    sequentialTimer = null;
  }
}

function resolveSegmentUrl(manifestUrl: string, line: string): string {
  if (line.startsWith('http://') || line.startsWith('https://')) return line;
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  return `${base}${line}`;
}

/** HLS manifest + ilk segment — CDN/decoder önbelleğini ısıtır. */
async function prefetchHlsHead(playbackId: string): Promise<void> {
  const manifestUrl = getMuxPlaybackUrl(playbackId);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(manifestUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return;

    const text = await response.text();
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    let childManifest: string | null = null;
    let firstSegment: string | null = null;

    for (const line of lines) {
      if (line.startsWith('#')) continue;
      if (line.includes('.m3u8') && !childManifest) {
        childManifest = resolveSegmentUrl(manifestUrl, line);
        continue;
      }
      if ((line.includes('.ts') || line.includes('.m4s')) && !firstSegment) {
        firstSegment = resolveSegmentUrl(manifestUrl, line);
      }
    }

    if (childManifest) {
      const childRes = await fetch(childManifest, { signal: controller.signal });
      if (childRes.ok) {
        const childText = await childRes.text();
        const childLine = childText
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line && !line.startsWith('#') && (line.includes('.ts') || line.includes('.m4s')));
        if (childLine) {
          firstSegment = resolveSegmentUrl(childManifest, childLine);
        }
      }
    }

    if (firstSegment) {
      await fetch(firstSegment, { method: 'GET', signal: controller.signal });
    }
  } catch {
    /* ağ yavaş — sessizce geç */
  }
}

async function warmReelAssets(item: ReelItem): Promise<void> {
  if (warmedAssetIds.has(item.id)) return;

  const tasks: Promise<unknown>[] = [];

  if (item.thumbnailUrl) {
    tasks.push(Image.prefetch(item.thumbnailUrl, 'memory-disk'));
  }

  if (item.musicPlayback?.audioUrl) {
    prefetchReelMusic(item.musicPlayback);
  }

  if (item.playbackId) {
    tasks.push(prefetchHlsHead(item.playbackId));
  }

  await Promise.allSettled(tasks);
  warmedAssetIds.add(item.id);
}

function runSequentialWarmup(generation: number) {
  if (generation !== sequentialGeneration) return;

  const batchSize = getReelWarmupBatchSize();
  let pending = 0;

  while (sequentialCursor < sequentialItems.length && pending < batchSize) {
    const item = sequentialItems[sequentialCursor];
    sequentialCursor += 1;
    if (!item?.playbackId) continue;

    pending += 1;
    void warmReelAssets(item).finally(() => {
      pending -= 1;
      if (generation !== sequentialGeneration) return;
      if (pending > 0) return;
      if (sequentialCursor >= sequentialItems.length) return;
      sequentialTimer = setTimeout(() => runSequentialWarmup(generation), getReelSequentialWarmupMs(REELS_SEQUENTIAL_WARMUP_MS));
    });
  }

  if (pending === 0 && sequentialCursor < sequentialItems.length) {
    sequentialTimer = setTimeout(
      () => runSequentialWarmup(generation),
      getReelSequentialWarmupMs(REELS_SEQUENTIAL_WARMUP_MS),
    );
  }
}

function scheduleHiddenVideoPreload(items: ReelItem[], activeIndex: number): void {
  const ids: string[] = [];
  for (let i = activeIndex - 1; i <= activeIndex + 2; i += 1) {
    if (i < 0 || i >= items.length) continue;
    if (i === activeIndex) continue;
    const playbackId = items[i]?.playbackId;
    if (playbackId) ids.push(playbackId);
  }
  scheduleReelVideoPreload(ids);
}

/** Aktif pencere anında; geri kalan feed sırayla arka planda ısınır. */
export function scheduleReelWarmup(items: ReelItem[], activeIndex: number): void {
  if (items.length === 0) return;

  const hot = getReelHotWindow(activeIndex, items.length);
  const prefetch = getReelPrefetchWindow(activeIndex, items.length);

  // Yalnızca görünür/yakın (hot) pencere anında paralel ısınır — bu öncelikli.
  for (let i = hot.min; i <= hot.max; i += 1) {
    const item = items[i];
    if (item) void warmReelAssets(item);
  }

  scheduleHiddenVideoPreload(items, activeIndex);

  sequentialGeneration += 1;
  const generation = sequentialGeneration;
  clearSequentialTimer();

  // Prefetch penceresi henüz görünmüyor; paralel patlama yerine hız-sınırlı sıralı
  // kuyruğa alınır (hot pencere hariç) — eşzamanlı HLS fetch sayısı düşer.
  const prefetchItems: ReelItem[] = [];
  for (let i = prefetch.min; i <= prefetch.max; i += 1) {
    if (i >= hot.min && i <= hot.max) continue;
    const item = items[i];
    if (item) prefetchItems.push(item);
  }
  // Tüm feed yerine prefetch penceresinden sonra sınırlı sayıda reel kuyruğa alınır.
  const tailEnd = Math.min(items.length, prefetch.max + 1 + REELS_SEQUENTIAL_MAX_AHEAD);
  sequentialItems = [...prefetchItems, ...items.slice(prefetch.max + 1, tailEnd)];
  sequentialCursor = 0;

  if (sequentialItems.length > 0) {
    sequentialTimer = setTimeout(
      () => runSequentialWarmup(generation),
      getReelSequentialWarmupMs(REELS_SEQUENTIAL_WARMUP_MS),
    );
  }
}

export function resetReelWarmup(): void {
  sequentialGeneration += 1;
  clearSequentialTimer();
  sequentialItems = [];
  sequentialCursor = 0;
  warmedAssetIds.clear();
}

export function markReelWarmed(reelId: string): void {
  warmedAssetIds.add(reelId);
}

export function isReelWarmed(reelId: string): boolean {
  return warmedAssetIds.has(reelId);
}

/** Reel'e tıklanınca thumbnail, HLS ve video buffer'ı hemen ısıt. */
export function primeReelForOpen(
  item: Pick<ReelItem, 'id' | 'playbackId' | 'thumbnailUrl' | 'musicPlayback'>,
): void {
  void warmReelAssets(item as ReelItem);
  if (item.playbackId) {
    primeReelVideoPreload(item.playbackId);
  }
}
