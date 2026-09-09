import * as VideoThumbnails from 'expo-video-thumbnails';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';

const warming = new Set<string>();
const warmingByUri = new Set<string>();
const posterByUri = new Map<string, string>();
const pendingByUri = new Map<string, Promise<string | null>>();

function applyPosterToMatchingEntries(normalizedUri: string, posterUri: string) {
  const state = useLocalVideoPreviewStore.getState();
  for (const [videoId, entry] of Object.entries(state.byVideoId)) {
    if (!entry.uri) continue;
    if (normalizeLocalFileUri(entry.uri) !== normalizedUri) continue;
    state.setPoster(videoId, posterUri);
  }
}

async function capturePoster(videoUri: string): Promise<string | null> {
  const normalized = normalizeLocalFileUri(videoUri);
  const cached = posterByUri.get(normalized);
  if (cached) return cached;

  const inflight = pendingByUri.get(normalized);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const { uri: posterUri } = await VideoThumbnails.getThumbnailAsync(normalized, {
        time: 0,
        quality: 0.72,
      });
      if (!posterUri) return null;
      posterByUri.set(normalized, posterUri);
      applyPosterToMatchingEntries(normalized, posterUri);
      return posterUri;
    } catch {
      return null;
    } finally {
      pendingByUri.delete(normalized);
    }
  })();

  pendingByUri.set(normalized, task);
  return task;
}

export function getCachedLocalVideoPoster(videoUri: string): string | null {
  return posterByUri.get(normalizeLocalFileUri(videoUri)) ?? null;
}

/** Yerel videoyu feed önizleme store'una yazar; varsa kapak karesini de bağlar. */
export function registerLocalVideoPreview(videoId: string, videoUri: string): void {
  if (!videoId || !videoUri) return;
  const poster = getCachedLocalVideoPoster(videoUri);
  useLocalVideoPreviewStore.getState().setPreview(videoId, videoUri, poster);
  if (!poster) {
    void ensureLocalVideoPoster(videoId, videoUri);
  }
}

/** Kapak karesini üretir ve store'a yazar. */
export async function ensureLocalVideoPoster(
  videoId: string,
  videoUri: string,
): Promise<string | null> {
  if (!videoId || !videoUri) return null;

  const existing = useLocalVideoPreviewStore.getState().byVideoId[videoId];
  if (existing?.posterUri) return existing.posterUri;

  if (warming.has(videoId)) {
    return getCachedLocalVideoPoster(videoUri);
  }

  warming.add(videoId);
  try {
    const posterUri = await capturePoster(videoUri);
    if (posterUri) {
      useLocalVideoPreviewStore.getState().setPoster(videoId, posterUri);
    }
    return posterUri;
  } finally {
    warming.delete(videoId);
  }
}

/** Geriye dönük: fire-and-forget ısıtma. */
export function warmLocalVideoPoster(videoId: string, videoUri: string): void {
  void ensureLocalVideoPoster(videoId, videoUri);
}

/** videoId oluşmadan önce (paylaşım başında) poster üretimini başlatır. */
export function warmLocalVideoPosterByUri(videoUri: string): void {
  if (!videoUri) return;
  const normalized = normalizeLocalFileUri(videoUri);
  if (posterByUri.has(normalized) || warmingByUri.has(normalized)) return;

  warmingByUri.add(normalized);
  void capturePoster(videoUri).finally(() => {
    warmingByUri.delete(normalized);
  });
}
