import { isVideoUrl } from '@/lib/media/isVideoUrl';

/** Hikâye öğesinin görsel olarak gösterilmesi gerekip gerekmediği. */
export function isStoryImageItem(mediaType: string, mediaUrl: string): boolean {
  if (mediaType === 'image') return true;
  if (mediaType === 'video') return !isVideoUrl(mediaUrl);
  return !isVideoUrl(mediaUrl);
}
