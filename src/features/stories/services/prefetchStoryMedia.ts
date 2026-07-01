import { Image } from 'expo-image';
import { kickstartMuxSync } from '@/services/video/muxPoll';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { isStoryImageItem, resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import type { StoryItem } from '@/features/stories/types';

/** Hikâye slaytı medyasını önceden ısıtır (kapak + Mux sync). */
export function prefetchStoryItemMedia(item: StoryItem): void {
  const thumb = resolveStoryThumbUrl(item.thumbUrl, item.mediaUrl);
  if (thumb) {
    void Image.prefetch(thumb);
  }

  if (isStoryImageItem(item.mediaType, item.mediaUrl)) {
    const uri = resolveStoryMediaUrl(item.mediaUrl);
    if (uri) void Image.prefetch(uri);
    return;
  }

  const videoId = parseProcessingVideoId(item.mediaUrl);
  if (videoId) {
    kickstartMuxSync(videoId);
    return;
  }

  const playback = resolveStoryMediaUrl(item.mediaUrl);
  if (playback?.includes('stream.mux.com')) {
    void Image.prefetch(playback.replace('.m3u8', '/thumbnail.jpg?time=0'));
  }
}

export function prefetchStoryBundleMedia(items: StoryItem[], activeIndex: number): void {
  const indices = [activeIndex, activeIndex + 1, activeIndex - 1];
  for (const index of indices) {
    const item = items[index];
    if (item) prefetchStoryItemMedia(item);
  }
}
