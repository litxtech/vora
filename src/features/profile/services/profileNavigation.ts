import { type Href, router } from 'expo-router';

/** Bireysel profil veya bağlı işletme detayına gider. */
export function navigateToPublicProfile(options: {
  userId: string;
  businessId?: string | null;
}): void {
  if (options.businessId) {
    router.push(`/detail/businesses/${options.businessId}` as Href);
    return;
  }
  router.push(`/user/${options.userId}` as Href);
}
