import type { FeedSourceType } from '@/features/feed/types';
import { type Href, router } from 'expo-router';

const DETAIL_PATHS: Partial<Record<FeedSourceType, (id: string) => string>> = {
  post: (id) => `/detail/posts/${id}`,
  incident: (id) => `/detail/incidents/${id}`,
  event: (id) => `/detail/events/${id}`,
  job: (id) => `/detail/jobs/${id}`,
  business: (id) => `/detail/businesses/${id}`,
  lost_found: (id) => `/detail/lost-found/${id}`,
};

export function navigateToFeedDetail(sourceType: FeedSourceType, sourceId: string, isDemo = false) {
  const build = DETAIL_PATHS[sourceType];
  if (!build) return;
  const href = `${build(sourceId)}${isDemo ? '?demo=1' : ''}` as Href;
  router.push(href);
}
