import { isVideoUrl } from '@/lib/media/isVideoUrl';

/** Hikâye öğesinin görsel olarak gösterilmesi gerekip gerekmediği. */
export function isStoryImageItem(mediaType: string, mediaUrl: string): boolean {
  if (mediaType === 'image') return true;
  if (mediaType === 'video') return !isVideoUrl(mediaUrl);
  return !isVideoUrl(mediaUrl);
}

/** Supabase render URL bazen hikâyede boş döner; doğrudan public URL kullan. */
export function resolveStoryMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('file:') || trimmed.startsWith('data:')) return trimmed;
  if (trimmed.includes('/storage/v1/render/image/')) {
    return trimmed.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/').split('?')[0] ?? trimmed;
  }
  return trimmed.split('?')[0] ?? trimmed;
}

export function resolveStoryThumbUrl(
  thumbUrl: string | null | undefined,
  mediaUrl: string | null | undefined,
): string | null {
  return resolveStoryMediaUrl(thumbUrl) ?? resolveStoryMediaUrl(mediaUrl);
}
