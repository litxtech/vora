import type { FeedAuthor, FeedSourceType } from '@/features/feed/types';
import { prefetchMapDetail } from '@/features/map/services/mapDetailCache';
import type { MapDetailType } from '@/features/map/types';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { type Href, router } from 'expo-router';

/** Yazar profiline gider — işletme hesaplarında kurumsal detaya yönlendirir. */
export function navigateToAuthorProfile(author: Pick<FeedAuthor, 'id' | 'username' | 'businessId'>) {
  if (author.id.startsWith('demo-')) return;
  navigateToPublicProfile({ userId: author.id, businessId: author.businessId });
}

const DETAIL_PATHS: Partial<Record<FeedSourceType, (id: string) => string>> = {
  post: (id) => `/detail/posts/${id}`,
  incident: (id) => `/detail/incidents/${id}`,
  event: (id) => `/detail/events/${id}`,
  job: (id) => `/detail/jobs/${id}`,
  business: (id) => `/detail/businesses/${id}`,
  lost_found: (id) => `/detail/lost-found/${id}`,
};

const FEED_SOURCE_TO_MAP_DETAIL: Partial<Record<FeedSourceType, MapDetailType>> = {
  post: 'posts',
  incident: 'incidents',
  event: 'events',
  job: 'jobs',
  business: 'businesses',
  lost_found: 'lost_found',
};

export function prefetchFeedDetail(sourceType: FeedSourceType, sourceId: string): void {
  const mapType = FEED_SOURCE_TO_MAP_DETAIL[sourceType];
  if (mapType) prefetchMapDetail(mapType, sourceId);
}

export function navigateToFeedDetail(
  sourceType: FeedSourceType,
  sourceId: string,
  isDemo = false,
  options?: { focusVideo?: boolean; mediaIndex?: number },
) {
  const build = DETAIL_PATHS[sourceType];
  if (!build) return;
  const params = new URLSearchParams();
  if (isDemo) params.set('demo', '1');
  if (options?.focusVideo) params.set('focusVideo', '1');
  if (options?.mediaIndex != null && options.mediaIndex > 0) {
    params.set('mediaIndex', String(options.mediaIndex));
  }
  const qs = params.toString();
  const href = `${build(sourceId)}${qs ? `?${qs}` : ''}` as Href;
  router.push(href);
}
