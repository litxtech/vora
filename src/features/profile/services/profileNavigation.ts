import { type Href, router } from 'expo-router';
import {
  prefetchBusinessDetailRoute,
  prefetchProfileScreenRoute,
} from '@/lib/navigation/lazyRouteScreens';
import {
  prefetchProfileVisit,
  seedProfileFromAuthor,
} from '@/features/profile/services/profileSessionLoad';
import {
  prefetchBusinessDetail,
  seedBusinessDetailFromAuthor,
} from '@/features/businesses/services/businessDetailCache';
import type { FeedAuthor } from '@/features/feed/types';

/** Bireysel profil veya bağlı işletme detayına gider. */
export function navigateToPublicProfile(options: {
  userId: string;
  businessId?: string | null;
  viewerId?: string | null;
  author?: FeedAuthor | null;
}): void {
  if (options.businessId) {
    if (options.author) {
      seedBusinessDetailFromAuthor(options.author);
    }
    void prefetchBusinessDetailRoute();
    prefetchBusinessDetail(options.businessId);
    router.push(`/detail/businesses/${options.businessId}` as Href);
    return;
  }

  const viewerId = options.viewerId ?? null;
  if (options.author && options.author.id === options.userId) {
    seedProfileFromAuthor(options.author, viewerId);
  }

  void prefetchProfileScreenRoute();
  prefetchProfileVisit(options.userId, viewerId);
  router.push(`/user/${options.userId}` as Href);
}

/** pressIn — profil / işletme tıklanmadan önce ısıt. */
export function prefetchPublicProfile(options: {
  userId: string;
  viewerId?: string | null;
  author?: FeedAuthor | null;
  businessId?: string | null;
}): void {
  const businessId = options.businessId ?? options.author?.businessId ?? null;
  if (businessId) {
    if (options.author) seedBusinessDetailFromAuthor(options.author);
    void prefetchBusinessDetailRoute();
    prefetchBusinessDetail(businessId);
    return;
  }

  const viewerId = options.viewerId ?? null;
  if (options.author && options.author.id === options.userId) {
    seedProfileFromAuthor(options.author, viewerId);
  }
  void prefetchProfileScreenRoute();
  prefetchProfileVisit(options.userId, viewerId);
}
