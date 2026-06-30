import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';

const VIDEO_PATTERN = /\.(mp4|mov|m4v|webm|mkv|avi)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (isProcessingVideoUrl(url)) return true;
  if (url.includes('image.mux.com')) return false;
  if (VIDEO_PATTERN.test(url)) return true;
  if (url.includes('stream.mux.com') || url.includes('.m3u8')) return true;
  if (url.includes('/message-media/') && (url.includes('_video.') || url.includes('_video/'))) return true;
  if (url.includes('/message-media/') && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url)) return true;
  if (url.includes('/izdivac-media/') && (url.includes('_video.') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url))) {
    return true;
  }
  return false;
}

export function isLocalVideoUri(uri: string): boolean {
  if (!uri) return false;
  if (isVideoUrl(uri)) return true;
  if (uri.includes('video/') || uri.includes('Video')) return true;
  return false;
}
