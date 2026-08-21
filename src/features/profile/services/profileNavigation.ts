import { type Href, router } from 'expo-router';
import { prefetchProfileScreenRoute } from '@/lib/navigation/lazyRouteScreens';
import { prefetchProfileBundle } from '@/features/profile/services/profileSessionLoad';

/** Bireysel profil veya bağlı işletme detayına gider. */
export function navigateToPublicProfile(options: {
  userId: string;
  businessId?: string | null;
  viewerId?: string | null;
}): void {
  if (options.businessId) {
    router.push(`/detail/businesses/${options.businessId}` as Href);
    return;
  }
  void prefetchProfileScreenRoute();
  prefetchProfileBundle(options.userId, options.viewerId ?? null);
  router.push(`/user/${options.userId}` as Href);
}

/** pressIn — profil tıklanmadan önce ısıt. */
export function prefetchPublicProfile(options: {
  userId: string;
  viewerId?: string | null;
}): void {
  void prefetchProfileScreenRoute();
  prefetchProfileBundle(options.userId, options.viewerId ?? null);
}
