import * as FileSystem from 'expo-file-system/legacy';
import { documentDirectory } from 'expo-file-system/legacy';
import { resolveStoryMediaUrl } from '@/features/stories/services/storyMediaUrl';
import { syncMuxVideo, extractMuxPlaybackId } from '@/lib/mux/client';
import {
  isProcessingVideoUrl,
  parseProcessingVideoId,
} from '@/lib/media/videoProcessingUrl';

async function resolveDownloadUrl(
  mediaUrl: string,
  mediaType: 'image' | 'video',
): Promise<{ url: string | null; error: string | null }> {
  const resolved = resolveStoryMediaUrl(mediaUrl);
  if (!resolved) {
    return { url: null, error: 'Medya bulunamadı.' };
  }

  if (mediaType === 'image') {
    return { url: resolved, error: null };
  }

  if (isProcessingVideoUrl(resolved)) {
    const videoId = parseProcessingVideoId(resolved);
    if (!videoId) {
      return { url: null, error: 'Video henüz hazır değil.' };
    }

    const mux = await syncMuxVideo(videoId);
    if (mux.status !== 'ready' || !mux.playbackId) {
      return { url: null, error: 'Video işleniyor. Biraz sonra tekrar deneyin.' };
    }

    return { url: `https://stream.mux.com/${mux.playbackId}/high.mp4`, error: null };
  }

  const playbackId = extractMuxPlaybackId(resolved);
  if (playbackId) {
    if (resolved.includes('.m3u8')) {
      return { url: `https://stream.mux.com/${playbackId}/high.mp4`, error: null };
    }
    return { url: resolved, error: null };
  }

  if (resolved.includes('.m3u8')) {
    return { url: null, error: 'Bu video indirilemedi. MP4 kopyası mevcut değil.' };
  }

  return { url: resolved, error: null };
}

/** Uzak hikâye medyasını cihaza indirip yerel URI döner. */
export async function cacheStoryArchiveMedia(
  mediaUrl: string,
  mediaType: 'image' | 'video',
  itemId: string,
): Promise<{ localUri: string | null; error: string | null }> {
  if (mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) {
    return { localUri: mediaUrl, error: null };
  }

  const { url, error } = await resolveDownloadUrl(mediaUrl, mediaType);
  if (error || !url) {
    return { localUri: null, error: error ?? 'Medya indirilemedi.' };
  }

  const ext = mediaType === 'video' ? '.mp4' : '.jpg';
  const dest = `${documentDirectory}story-archive-${itemId}${ext}`;

  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && (info.size ?? 0) > 0) {
      return { localUri: dest, error: null };
    }

    const result = await FileSystem.downloadAsync(url, dest);
    if (result.status !== 200) {
      return { localUri: null, error: 'Dosya indirilemedi.' };
    }
    return { localUri: result.uri, error: null };
  } catch {
    return { localUri: null, error: 'Dosya indirilemedi.' };
  }
}
