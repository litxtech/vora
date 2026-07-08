import type { StoryItem } from '@/features/stories/types';

/** Hikâye videosunun orijinal ses seviyesi — müzik varsa müzik manifestinden. */
export function resolveStoryVideoOriginalVolume(item: StoryItem): number {
  if (item.music) return item.music.originalAudioVolume;
  return item.originalAudioVolume ?? 1;
}

export function isStoryVideoOriginalMuted(item: StoryItem): boolean {
  return resolveStoryVideoOriginalVolume(item) <= 0.001;
}
