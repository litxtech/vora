import type { FeedAuthor, FeedSourceType } from '@/features/feed/types';
import { prefetchMapDetail } from '@/features/map/services/mapDetailCache';
import type { MapDetailType } from '@/features/map/types';
import { navigateToPublicProfile, prefetchPublicProfile } from '@/features/profile/services/profileNavigation';
import { type Href, router } from 'expo-router';
import { pushRoute } from '@/lib/navigation/pushRoute';
import {
  prefetchFeedDetailRoute,
} from '@/lib/navigation/lazyRouteScreens';

/** Yazar profiline gider — işletme hesaplarında kurumsal detaya yönlendirir. */
export function navigateToAuthorProfile(
  author: Pick<FeedAuthor, 'id' | 'username' | 'businessId'> & Partial<FeedAuthor>,
  viewerId?: string | null,
) {
  if (author.id.startsWith('demo-')) return;
  navigateToPublicProfile({
    userId: author.id,
    businessId: author.businessId,
    viewerId: viewerId ?? null,
    author: author as FeedAuthor,
  });
}

export function prefetchAuthorProfile(
  author: Pick<FeedAuthor, 'id' | 'businessId'> & Partial<FeedAuthor>,
  viewerId?: string | null,
) {
  if (author.id.startsWith('demo-')) return;
  prefetchPublicProfile({
    userId: author.id,
    viewerId: viewerId ?? null,
    author: author as FeedAuthor,
    businessId: author.businessId,
  });
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

function buildFeedDetailHref(
  sourceType: FeedSourceType,
  sourceId: string,
  isDemo = false,
  options?: { focusVideo?: boolean; mediaIndex?: number },
): Href | null {
  const build = DETAIL_PATHS[sourceType];
  if (!build) return null;
  const params = new URLSearchParams();
  if (isDemo) params.set('demo', '1');
  if (options?.focusVideo) params.set('focusVideo', '1');
  if (options?.mediaIndex != null && options.mediaIndex > 0) {
    params.set('mediaIndex', String(options.mediaIndex));
  }
  const qs = params.toString();
  return `${build(sourceId)}${qs ? `?${qs}` : ''}` as Href;
}

export function prefetchFeedDetail(sourceType: FeedSourceType, sourceId: string): void {
  // Dev client: router.prefetch + lazy chunk import Metro'da binlerce modül derler.
  if (__DEV__) return;

  const href = buildFeedDetailHref(sourceType, sourceId);
  if (href) router.prefetch(href);

  prefetchFeedDetailRoute(sourceType);

  const mapType = FEED_SOURCE_TO_MAP_DETAIL[sourceType];
  if (mapType) prefetchMapDetail(mapType, sourceId);
}

export function navigateToFeedDetail(
  sourceType: FeedSourceType,
  sourceId: string,
  isDemo = false,
  options?: { focusVideo?: boolean; mediaIndex?: number },
) {
  const href = buildFeedDetailHref(sourceType, sourceId, isDemo, options);
  if (!href) return;
  pushRoute(href);
}
