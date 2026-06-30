import type { VideoSource } from 'expo-video';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';

export function toVideoSource(uri: string): VideoSource | null {
  if (!uri || isProcessingVideoUrl(uri)) return null;

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const isHls = uri.includes('.m3u8') || uri.includes('stream.mux.com');
    return {
      uri,
      contentType: isHls ? 'hls' : 'progressive',
    };
  }

  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
    return uri;
  }

  return null;
}

export function isPlayableVideoUrl(uri: string): boolean {
  return toVideoSource(uri) != null;
}
