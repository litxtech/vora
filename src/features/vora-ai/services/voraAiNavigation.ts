import { type Href, router } from 'expo-router';
import type { VoraAiResultItem } from '@/features/vora-ai/types';

export function voraAiResultDetailHref(item: VoraAiResultItem): Href | null {
  const type = item.type ?? '';

  switch (type) {
    case 'reel':
      return `/reels?reelId=${item.id}` as Href;
    case 'business':
      return `/detail/businesses/${item.id}` as Href;
    case 'event':
      return `/detail/events/${item.id}` as Href;
    case 'traffic':
      return `/detail/traffic/${item.id}` as Href;
    case 'tourism':
    case 'historic':
      return `/detail/tourism/${item.id}` as Href;
    case 'post':
    case 'news':
    case 'trend':
      return `/detail/posts/${item.id}` as Href;
    default:
      return null;
  }
}

export function navigateVoraAiResultItem(item: VoraAiResultItem): boolean {
  const href = voraAiResultDetailHref(item);
  if (!href) return false;
  router.push(href);
  return true;
}
