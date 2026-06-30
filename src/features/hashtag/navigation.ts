import type { Href } from 'expo-router';
import { normalizeHashtagTag } from '@/features/feed/utils';

export function hashtagPath(rawTag: string): Href {
  const tag = normalizeHashtagTag(rawTag);
  return `/hashtag/${encodeURIComponent(tag)}` as Href;
}
