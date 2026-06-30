import { router, type Href } from 'expo-router';
import type { NotificationEventType } from '@/constants/notifications';
import {
  extractTargetIds,
  isLikelyUuid,
  isTruthyDataFlag,
  normalizeNotificationData,
} from '@/lib/notifications/notificationPayload';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { useMessagingStore } from '@/features/messaging/store/messagingStore';
import { openReelById } from '@/features/reels/services/reelsNavigation';
import { resolveIzdivacNotificationHref } from '@/features/izdivac/utils/notificationRouting';
import { rideRefundRequestPath } from '@/features/rides/constants';
import { resolveRideNotificationHref, shouldOpenRideRefundRequest } from '@/features/rides/utils/notificationRouting';
import { WALLET_ROUTE } from '@/features/wallet/constants';
import { presentIncomingCall } from '@/features/calls/services/presentIncomingCall';

export type NotificationNavigationOptions = {
  /** Bildirim kutusundan açıldıysa /notifications yığılmasını engeller */
  fromInbox?: boolean;
};

function pickDeepLink(data: Record<string, unknown>): string | null {
  const raw = data.deep_link ?? data.deepLink ?? data.url;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

function safePush(href: Href | string): void {
  try {
    router.push(href as Href);
  } catch {
    safeReplace('/notifications');
  }
}

function safeReplace(href: Href | string): void {
  try {
    router.replace(href as Href);
  } catch {
    try {
      router.push(href as Href);
    } catch {
      // Navigasyon hazır değilse sessizce geç
    }
  }
}

function navigateInboxFallback(options?: NotificationNavigationOptions): void {
  if (options?.fromInbox) return;
  safePush('/notifications');
}

function tryNavigateDeepLink(data: Record<string, unknown>): boolean {
  const deepLink = pickDeepLink(data);
  if (!deepLink) return false;
  safePush(deepLink as Href);
  return true;
}

function tryNavigateIzdivacNotification(
  eventType: NotificationEventType | string,
  data: Record<string, unknown>,
): boolean {
  const href = resolveIzdivacNotificationHref(eventType, data);
  if (!href) return false;
  safePush(href as Href);
  return true;
}

function navigateToMarketplaceListing(listingId: string | null): void {
  if (!isLikelyUuid(listingId)) {
    safePush('/marketplace-center' as Href);
    return;
  }
  safePush(`/detail/marketplace/${listingId}` as Href);
}

function tryNavigateByTargets(
  data: Record<string, unknown>,
  actorId?: string | null,
): boolean {
  const ids = extractTargetIds(data);

  if (ids.callSessionId) {
    void presentIncomingCall(ids.callSessionId);
    return true;
  }
  if (ids.conversationId) {
    navigateToConversation(ids.conversationId);
    return true;
  }
  if (ids.postId) {
    navigateToPost(ids.postId, ids.commentId);
    return true;
  }
  if (ids.reelId) {
    navigateToReel(ids.reelId);
    return true;
  }
  if (ids.tripId) {
    safePush(`/detail/rides/${ids.tripId}` as Href);
    return true;
  }
  if (ids.listingId) {
    navigateToMarketplaceListing(ids.listingId);
    return true;
  }
  if (ids.eventId) {
    safePush(`/detail/events/${ids.eventId}` as Href);
    return true;
  }
  if (ids.incidentId) {
    safePush(`/detail/incidents/${ids.incidentId}` as Href);
    return true;
  }
  if (ids.lostItemId) {
    safePush(`/detail/lost-found/${ids.lostItemId}` as Href);
    return true;
  }
  if (ids.voraNeedId) {
    safePush(`/detail/vora-needs/${ids.voraNeedId}` as Href);
    return true;
  }
  if (ids.hotelId) {
    safePush(`/detail/hotels/${ids.hotelId}` as Href);
    return true;
  }
  if (ids.channelId) {
    navigateToChannel(ids.channelId, ids.postId);
    return true;
  }
  if (ids.jobId) {
    safePush(`/detail/jobs/${ids.jobId}` as Href);
    return true;
  }
  const profileId = isLikelyUuid(actorId) ? actorId : ids.actorId;
  if (isLikelyUuid(profileId)) {
    navigateToUser(profileId);
    return true;
  }

  return false;
}

function navigateProximityMatchProfile(
  data: Record<string, unknown>,
  actorId?: string | null,
): boolean {
  const deepLink = pickDeepLink(data);
  if (deepLink !== '/proximity-matches') return false;

  const ids = extractTargetIds(data);
  const profileUserId =
    (typeof data.other_user_id === 'string' && isLikelyUuid(data.other_user_id)
      ? data.other_user_id
      : null) ||
    (typeof data.otherUserId === 'string' && isLikelyUuid(data.otherUserId)
      ? data.otherUserId
      : null) ||
    (isLikelyUuid(actorId) ? actorId : null) ||
    ids.actorId;

  if (isLikelyUuid(profileUserId)) {
    safePush(`/user/${profileUserId}` as Href);
    return true;
  }

  safePush('/proximity-matches' as Href);
  return true;
}

function navigateSystemNotification(
  data: Record<string, unknown>,
  notificationId?: string,
  actorId?: string | null,
  options?: NotificationNavigationOptions,
): void {
  if (navigateProximityMatchProfile(data, actorId)) return;
  if (tryNavigateDeepLink(data)) return;
  if (tryNavigateIzdivacNotification('system', data)) return;

  if (isTruthyDataFlag(data.broadcast)) {
    if (tryNavigateByTargets(data, actorId)) return;
    safeReplace('/(tabs)' as Href);
    return;
  }

  const kind = data.kind as string | undefined;
  const params: Record<string, string> = {};
  if (notificationId) params.notificationId = notificationId;

  switch (kind) {
    case 'account_reactivated':
      safePush({ pathname: '/account-notice', params } as Href);
      return;
    case 'account_lifecycle_received':
    case 'account_lifecycle_update': {
      const requestId = data.request_id ?? data.requestId;
      if (requestId) {
        safePush({
          pathname: '/lifecycle-request/[id]',
          params: { id: String(requestId), ...params },
        } as Href);
        return;
      }
      break;
    }
    case 'support_ticket_received':
    case 'support_ticket_update': {
      const ticketId = data.ticket_id ?? data.ticketId;
      if (ticketId) {
        safePush({ pathname: '/support/[id]', params: { id: String(ticketId) } } as Href);
        return;
      }
      safePush('/support-center' as Href);
      return;
    }
    case 'premium_support_started':
    case 'premium_support_message':
    case 'premium_support_status':
    case 'premium_support_expired': {
      const threadId = data.thread_id ?? data.threadId;
      if (data.admin_alert && threadId) {
        safePush({
          pathname: '/admin/premium-support/[id]',
          params: { id: String(threadId) },
        } as Href);
        return;
      }
      safePush('/premium-support' as Href);
      return;
    }
    case 'live_support_started':
    case 'live_support_message':
    case 'live_support_status':
    case 'live_support_expired': {
      const threadId = data.thread_id ?? data.threadId;
      if (data.admin_alert && threadId) {
        safePush({
          pathname: '/admin/live-support/[id]',
          params: { id: String(threadId) },
        } as Href);
        return;
      }
      safePush('/support-center' as Href);
      return;
    }
    default:
      break;
  }

  if (tryNavigateByTargets(data, actorId)) return;
  navigateInboxFallback(options);
}

function navigateToPost(postId: string | null, commentId?: string | null): void {
  if (!isLikelyUuid(postId)) {
    safePush('/(tabs)' as Href);
    return;
  }
  const params: Record<string, string> = {};
  if (commentId && isLikelyUuid(commentId)) params.commentId = commentId;
  if (Object.keys(params).length > 0) {
    safePush({ pathname: '/detail/posts/[id]', params: { id: postId!, ...params } } as Href);
  } else {
    safePush(`/p/${postId}` as Href);
  }
}

function navigateToReel(reelId: string | null): void {
  if (!isLikelyUuid(reelId)) {
    safePush('/(tabs)/reels' as Href);
    return;
  }
  openReelById(reelId);
}

function navigateToConversation(conversationId: string | null): void {
  if (!isLikelyUuid(conversationId)) {
    safePush('/(tabs)/messages' as Href);
    return;
  }
  const store = useMessagingStore.getState();
  const unread = store.getDisplayUnread(
    conversationId,
    store.conversationUnreadById[conversationId] ?? 0,
  );
  openChat(conversationId, unread > 0 ? { unreadCount: unread } : undefined);
}

function navigateToUser(actorId: string | null, options?: NotificationNavigationOptions): void {
  if (!isLikelyUuid(actorId)) {
    navigateInboxFallback(options);
    return;
  }
  safePush(`/user/${actorId}` as Href);
}

function navigateToChannel(channelId: string | null, postId?: string | null): void {
  if (!isLikelyUuid(channelId)) {
    safePush('/channels' as Href);
    return;
  }
  const params: Record<string, string> = {};
  if (postId && isLikelyUuid(postId)) params.postId = postId;
  safePush({ pathname: '/channels/[id]', params: { id: channelId!, ...params } } as Href);
}

function performNavigation(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
  actorId?: string | null,
  notificationId?: string,
  options?: NotificationNavigationOptions,
): void {
  if (tryNavigateDeepLink(data)) return;
  if (tryNavigateIzdivacNotification(eventType, data)) return;

  const ids = extractTargetIds(data);

  switch (eventType) {
    case 'message':
    case 'group_message': {
      if (ids.callSessionId) {
        void presentIncomingCall(ids.callSessionId);
      } else if (ids.conversationId) {
        navigateToConversation(ids.conversationId);
      } else if (ids.tripId) {
        safePush(`/detail/rides/${ids.tripId}` as Href);
      } else {
        safePush('/(tabs)/messages' as Href);
      }
      break;
    }
    case 'call_incoming':
    case 'call_video': {
      if (ids.callSessionId) {
        void presentIncomingCall(ids.callSessionId);
      } else if (ids.conversationId) {
        navigateToConversation(ids.conversationId);
      } else {
        safePush('/(tabs)/messages' as Href);
      }
      break;
    }
    case 'call_missed': {
      if (ids.callSessionId) {
        safePush({ pathname: '/call/[sessionId]', params: { sessionId: ids.callSessionId } } as Href);
      } else if (ids.conversationId) {
        navigateToConversation(ids.conversationId);
      } else {
        safePush('/(tabs)/messages' as Href);
      }
      break;
    }
    case 'like':
    case 'comment':
    case 'comment_reply':
    case 'quote':
    case 'mention':
    case 'save':
    case 'share':
      if (ids.reelId && !ids.postId) navigateToReel(ids.reelId);
      else navigateToPost(ids.postId, ids.commentId);
      break;
    case 'reel_like':
      navigateToReel(ids.reelId);
      break;
    case 'follow':
    case 'friend_request':
    case 'friend_accepted':
      navigateToUser(actorId ?? ids.actorId, options);
      break;
    case 'feed_activity': {
      const deepLink = pickDeepLink(data);
      if (ids.postId) navigateToPost(ids.postId);
      else if (deepLink) safePush(deepLink as Href);
      else safePush('/(tabs)' as Href);
      break;
    }
    case 'job': {
      if (ids.applicationId) safePush(`/personnel-center/application/${ids.applicationId}` as Href);
      else if (ids.jobId) safePush(`/detail/jobs/${ids.jobId}` as Href);
      else if (ids.staffRequestId) safePush(`/detail/staff/${ids.staffRequestId}` as Href);
      else safePush('/personnel-center' as Href);
      break;
    }
    case 'business_post':
      if (ids.postId) navigateToPost(ids.postId);
      else safePush('/(tabs)' as Href);
      break;
    case 'business_campaign':
    case 'business_event':
      if (ids.eventId) safePush(`/detail/events/${ids.eventId}` as Href);
      else safePush('/(tabs)/profile' as Href);
      break;
    case 'channel_post':
      navigateToChannel(ids.channelId, ids.postId);
      break;
    case 'system':
      navigateSystemNotification(data, notificationId, actorId, options);
      break;
    case 'emergency':
    case 'regional_alert':
    case 'incident_update':
      if (ids.incidentId) safePush(`/detail/incidents/${ids.incidentId}` as Href);
      else safePush('/(tabs)/map' as Href);
      break;
    case 'event_nearby':
    case 'event_reminder':
      if (ids.eventId) safePush(`/detail/events/${ids.eventId}` as Href);
      else safePush('/(tabs)/map' as Href);
      break;
    case 'lost_item_nearby':
    case 'lost_item_tip':
      if (ids.lostItemId) safePush(`/detail/lost-found/${ids.lostItemId}` as Href);
      else safePush('/lost-center' as Href);
      break;
    case 'vora_need_published':
      if (ids.voraNeedId) safePush(`/detail/vora-needs/${ids.voraNeedId}` as Href);
      else if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else {
        safePush('/vora-needs-center' as Href);
      }
      break;
    case 'vora_service_request_published':
    case 'vora_service_offer_accepted':
    case 'vora_service_offer_received':
      if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else if (typeof data.request_id === 'string') {
        safePush(`/detail/vora-hizmetler/request/${data.request_id}` as Href);
      } else {
        safePush('/(tabs)/services' as Href);
      }
      break;
    case 'vora_service_offer_rejected':
      safePush('/vora-hizmetler?tab=offers' as Href);
      break;
    case 'vora_service_job_completed':
    case 'vora_service_job_started':
    case 'vora_service_completion_proof':
    case 'vora_service_payout_due':
    case 'vora_service_payout_completed':
      if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else if (typeof data.request_id === 'string') {
        safePush(`/detail/vora-hizmetler/request/${data.request_id}` as Href);
      } else {
        safePush('/wallet' as Href);
      }
      break;
    case 'vora_service_emergency_call':
      if (typeof data.emergency_session_id === 'string') {
        safePush(`/vora-hizmetler/emergency/respond/${data.emergency_session_id}` as Href);
      } else {
        safePush('/vora-hizmetler/emergency' as Href);
      }
      break;
    case 'vora_service_emergency_matched':
    case 'vora_service_live_location_shared':
    case 'vora_service_dispute_opened':
    case 'vora_service_refund_completed':
    case 'vora_service_payout_reminder':
      if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else if (typeof data.request_id === 'string') {
        safePush(`/detail/vora-hizmetler/request/${data.request_id}` as Href);
      } else {
        safePush('/vora-hizmetler?tab=active' as Href);
      }
      break;
    case 'hotel_review':
      if (ids.hotelId) safePush(`/detail/hotels/${ids.hotelId}` as Href);
      else if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else {
        safePush('/hotel-center' as Href);
      }
      break;
    case 'hotel_payout_due':
    case 'hotel_payout_completed':
      if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else {
        safePush(WALLET_ROUTE as Href);
      }
      break;
    case 'hotel_reservation_paid':
    case 'hotel_reservation_received':
    case 'hotel_reservation_cancelled':
    case 'hotel_marketing_campaign':
      if (typeof data.deep_link === 'string' && data.deep_link.startsWith('/')) {
        safePush(data.deep_link as Href);
      } else if (ids.hotelId) {
        safePush(`/detail/hotels/${ids.hotelId}` as Href);
      } else if (eventType === 'hotel_reservation_paid' || eventType === 'hotel_reservation_received' || eventType === 'hotel_reservation_cancelled') {
        safePush('/hotel-center/reservations' as Href);
      } else {
        safePush('/hotel-center' as Href);
      }
      break;
    case 'trust_score_change':
    case 'friend_invite_referral':
    case 'trust_milestone_80':
    case 'trust_reward_pool':
      safePush(WALLET_ROUTE as Href);
      break;
    case 'achievement_earned':
    case 'badge_earned':
      safePush('/(tabs)/profile' as Href);
      break;
    case 'security_alert':
      safePush('/settings/account' as Href);
      break;
    case 'ride_reservation_rejected':
    case 'ride_trip_cancelled':
      if (ids.reservationId && shouldOpenRideRefundRequest(eventType, data)) {
        safePush(
          rideRefundRequestPath({
            tripId: ids.tripId ?? undefined,
            reservationId: ids.reservationId,
          }) as Href,
        );
      } else {
        safePush(resolveRideNotificationHref(eventType, data) as Href);
      }
      break;
    case 'ride_passenger_cancelled_reservation':
      safePush(resolveRideNotificationHref(eventType, data) as Href);
      break;
    case 'ride_reservation_new':
    case 'ride_reservation_paid':
    case 'ride_reservation_approved':
    case 'ride_trip_started':
    case 'ride_trip_completed':
    case 'ride_trip_starting_soon':
    case 'ride_trip_departure_soon':
    case 'ride_trip_departure_due':
    case 'ride_trip_complete_soon':
    case 'ride_payout_due':
    case 'ride_payout_completed':
    case 'ride_live_location_shared':
      safePush(resolveRideNotificationHref(eventType, data) as Href);
      break;
    case 'marketplace_order_paid':
    case 'marketplace_ship_request':
    case 'marketplace_buyer_confirm':
    case 'marketplace_platform_approved':
    case 'marketplace_comment':
      if (tryNavigateDeepLink(data)) break;
      navigateToMarketplaceListing(ids.listingId);
      break;
    case 'marketplace_payout_due':
    case 'marketplace_payout_completed':
      if (tryNavigateDeepLink(data)) break;
      if (ids.listingId) navigateToMarketplaceListing(ids.listingId);
      else safePush('/marketplace-center/account' as Href);
      break;
    case 'content_warning':
      if (ids.postId) navigateToPost(ids.postId);
      else if (ids.reelId) navigateToReel(ids.reelId);
      else navigateInboxFallback(options);
      break;
    default:
      if (tryNavigateByTargets(data, actorId)) break;
      navigateInboxFallback(options);
  }
}

function runNotificationNavigation(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
  actorId?: string | null,
  notificationId?: string,
  options?: NotificationNavigationOptions,
): void {
  // Hedefe doğrudan git. Cold start'ta boot zaten anasayfayı root yapar ve
  // pendingNavigation flush'ı navigator hazır olana kadar bekler; bu yüzden
  // burada tekrar anasayfaya replace etmek ("anasayfaya gidiyor") ve push'u
  // InteractionManager ile ertelemek ("çok geç gidiyor") gereksizdir.
  performNavigation(eventType, data, actorId, notificationId, options);
}

export function navigateFromNotification(
  eventType: NotificationEventType,
  rawData: Record<string, unknown>,
  actorId?: string | null,
  notificationId?: string,
  options?: NotificationNavigationOptions,
): void {
  const data = normalizeNotificationData(rawData);
  runNotificationNavigation(eventType, data, actorId, notificationId, options);
}
