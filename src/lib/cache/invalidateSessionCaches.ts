import { invalidateDiscoveryCache } from '@/features/discovery/services/discoverySessionCache';
import { invalidateMarketplaceListingCache } from '@/features/marketplace/services/marketplaceDetailCache';
import { invalidateMarketplaceListCache } from '@/features/marketplace/services/marketplaceListCache';
import { invalidateMapDetailCache } from '@/features/map/services/mapDetailCache';
import { invalidateBusinessDetailCache } from '@/features/businesses/services/businessDetailCache';
import { invalidateVoraNeedDetailCache } from '@/features/vora-needs/services/voraNeedDetailCache';
import { invalidateVoraNeedsListCache } from '@/features/vora-needs/services/voraNeedsListCache';
import { invalidateNotificationsCache } from '@/features/notifications/services/notificationsInboxCache';
import { invalidateConversationListCache } from '@/features/messaging/services/conversationListCache';
import { invalidateProfileSessionCache } from '@/features/profile/services/profileSessionCache';
import { invalidateReelsFeedCache } from '@/features/reels/services/reelsFeedCache';

/** Oturum kapanınca bellek önbelleklerini temizle. */
export function invalidateAllSessionCaches(userId?: string): void {
  invalidateProfileSessionCache(userId);
  invalidateDiscoveryCache();
  invalidateMarketplaceListCache();
  invalidateMarketplaceListingCache();
  invalidateMapDetailCache();
  invalidateBusinessDetailCache();
  invalidateVoraNeedDetailCache();
  invalidateVoraNeedsListCache();
  invalidateNotificationsCache(userId);
  invalidateConversationListCache(userId);
  invalidateReelsFeedCache();
}
