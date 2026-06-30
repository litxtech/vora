import type { Ionicons } from '@expo/vector-icons';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_PRIORITIES,
  emergencyLabel,
  type NotificationCategoryId,
} from '@/constants/notifications';
import {
  isVoraOfficialNotification,
  VORA_NOTIFICATION_SENDER,
} from '@/features/notifications/constants/branding';
import { PRIORITY_COLORS } from '@/features/notifications/constants';
import { ACHIEVEMENT_CONFIG } from '@/features/profile/constants';
import {
  getIzdivacNotificationActionLabel,
  isIzdivacNotificationEvent,
} from '@/features/izdivac/utils/notificationRouting';
import {
  getRideNotificationActionLabel,
  getRideNotificationDetailLines,
  isRideNotificationEvent,
  rideRouteLabel,
} from '@/features/rides/utils/notificationRouting';
import type { AppNotification } from '@/lib/notifications/types';
import {
  extractTargetIds,
  normalizeNotificationData,
} from '@/lib/notifications/notificationPayload';

export const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  comment_reply: 'chatbubble-ellipses',
  mention: 'at',
  quote: 'repeat',
  share: 'share-social',
  save: 'bookmark',
  follow: 'person-add',
  friend_request: 'people',
  friend_accepted: 'people',
  account_link_request: 'link',
  account_link_accepted: 'checkmark-circle',
  account_link_declined: 'close-circle',
  reel_like: 'heart',
  message: 'mail',
  group_message: 'people',
  channel_post: 'radio',
  event_reminder: 'alarm',
  lost_item_nearby: 'search',
  lost_item_tip: 'bulb',
  trust_score_change: 'shield-checkmark',
  friend_invite_referral: 'gift-outline',
  trust_milestone_80: 'trophy-outline',
  trust_reward_pool: 'airplane-outline',
  achievement_earned: 'trophy',
  badge_earned: 'ribbon',
  emergency: 'warning',
  regional_alert: 'location',
  job: 'briefcase',
  event_nearby: 'calendar',
  incident_update: 'alert-circle',
  security_alert: 'shield',
  business_post: 'storefront',
  business_campaign: 'pricetag',
  business_event: 'calendar',
  feed_activity: 'flame',
  call_incoming: 'call',
  call_video: 'videocam',
  call_missed: 'call-outline',
  system: 'megaphone',
  marketplace_order_paid: 'cart',
  marketplace_ship_request: 'cube',
  marketplace_buyer_confirm: 'checkmark-circle',
  marketplace_platform_approved: 'shield-checkmark',
  marketplace_payout_due: 'wallet',
  marketplace_payout_completed: 'cash',
  marketplace_comment: 'chatbubble-ellipses',
  ride_reservation_new: 'car',
  ride_reservation_paid: 'card',
  ride_reservation_approved: 'checkmark-circle',
  ride_reservation_rejected: 'close-circle',
  ride_passenger_cancelled_reservation: 'person-remove',
  ride_trip_cancelled: 'ban',
  ride_trip_started: 'navigate',
  ride_trip_completed: 'flag',
  ride_trip_starting_soon: 'time',
  ride_trip_departure_soon: 'time-outline',
  ride_trip_departure_due: 'alarm',
  ride_trip_complete_soon: 'flag-outline',
  ride_payout_due: 'wallet',
  ride_payout_completed: 'cash',
  ride_live_location_shared: 'location',
  content_warning: 'alert',
  izdivac_access_granted: 'heart',
  izdivac_access_revoked: 'heart-dislike',
  izdivac_post_comment: 'chatbubble',
  izdivac_post_join: 'people',
  izdivac_invite_received: 'mail',
  izdivac_invite_accepted: 'checkmark-circle',
  hotel_reservation_paid: 'bed',
  hotel_reservation_received: 'bed-outline',
  hotel_reservation_cancelled: 'close-circle',
  hotel_review: 'star',
  hotel_payout_due: 'wallet',
  hotel_payout_completed: 'cash',
  hotel_marketing_campaign: 'megaphone',
};

export const CATEGORY_COLORS: Record<Exclude<NotificationCategoryId, 'all'>, string> = {
  social: '#1E88E5',
  messages: '#7E57C2',
  jobs: '#FB8C00',
  businesses: '#00897B',
  emergency: '#D32F2F',
  system: '#78909C',
};

export type NotificationDetailLine = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function pickNumber(data: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function getEventLabel(eventType: string): string {
  return NOTIFICATION_EVENT_TYPES.find((entry) => entry.id === eventType)?.label ?? eventType;
}

export function getCategoryLabel(category: NotificationCategoryId): string {
  if (category === 'all') return 'Tümü';
  return NOTIFICATION_CATEGORIES.find((entry) => entry.id === category)?.label ?? category;
}

export function getPriorityLabel(priority: AppNotification['priority']): string | null {
  if (priority === 'normal' || priority === 'low') return null;
  return NOTIFICATION_PRIORITIES.find((entry) => entry.id === priority)?.label ?? priority;
}

export function isEmergencyNotification(item: AppNotification): boolean {
  return item.category === 'emergency' || item.priority === 'critical';
}

export function getNotificationAccent(
  item: AppNotification,
  fallback: string,
): string {
  if (isEmergencyNotification(item)) return PRIORITY_COLORS.critical;
  if (item.priority === 'high') return PRIORITY_COLORS.high;
  if (item.category !== 'all') return CATEGORY_COLORS[item.category] ?? fallback;
  return PRIORITY_COLORS[item.priority] ?? fallback;
}

export function getSenderLabel(item: AppNotification): string {
  if (isVoraOfficialNotification(item.data, item.eventType)) return VORA_NOTIFICATION_SENDER;
  return getEventLabel(item.eventType);
}

export function getImageUrl(data: Record<string, unknown>): string | null {
  const normalized = normalizeNotificationData(data);
  const actorAvatar = pickString(normalized, 'actor_avatar_url', 'actorAvatarUrl');
  const candidates = [
    pickString(normalized, 'content_image_url', 'contentImageUrl'),
    pickString(normalized, 'thumbnail_url', 'thumbnailUrl'),
    pickString(normalized, 'image_url', 'imageUrl'),
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    if (actorAvatar && url === actorAvatar) continue;
    return url;
  }
  return null;
}

export function getContentPreview(item: AppNotification): string | null {
  const data = normalizeNotificationData(item.data);
  return pickString(
    data,
    'comment_preview',
    'commentPreview',
    'post_preview',
    'postPreview',
    'message_preview',
    'messagePreview',
    'content_preview',
    'contentPreview',
  );
}

export function getNotificationDetailLines(item: AppNotification): NotificationDetailLine[] {
  const data = normalizeNotificationData(item.data);
  const lines: NotificationDetailLine[] = [];

  const push = (icon: NotificationDetailLine['icon'], label: string, value: string) => {
    if (!value.trim()) return;
    lines.push({ icon, label, value: value.trim() });
  };

  const emergencyType = pickString(data, 'emergency_type', 'emergencyType');
  if (emergencyType) {
    push('warning', 'Acil türü', emergencyLabel(emergencyType));
  }

  const region = pickString(data, 'region_name', 'regionName', 'district', 'location_name', 'locationName');
  if (region) push('location-outline', 'Konum', region);

  const postCount = pickNumber(data, 'recent_post_count', 'recentPostCount');
  if (postCount != null && postCount > 0) {
    push('flame', 'Aktivite', `${postCount} yeni paylaşım`);
  }

  if (isRideNotificationEvent(item.eventType)) {
    return getRideNotificationDetailLines(item.eventType, data);
  }

  const rideRoute = rideRouteLabel(data);
  if (rideRoute) {
    push('navigate-outline', 'Güzergâh', rideRoute);
  }

  const routeFrom = pickString(data, 'from_city', 'fromCity', 'origin');
  const routeTo = pickString(data, 'to_city', 'toCity', 'destination');
  if (!rideRoute && routeFrom && routeTo) {
    push('navigate-outline', 'Güzergâh', `${routeFrom} → ${routeTo}`);
  } else if (!rideRoute && routeFrom) {
    push('navigate-outline', 'Kalkış', routeFrom);
  } else if (!rideRoute && routeTo) {
    push('navigate-outline', 'Varış', routeTo);
  }

  const seatCount = pickNumber(data, 'seat_count', 'seatCount');
  if (seatCount != null && seatCount > 0) {
    push('people-outline', 'Rezervasyon', `${seatCount} koltuk`);
  }

  const jobTitle = pickString(data, 'job_title', 'jobTitle');
  if (jobTitle) push('briefcase-outline', 'İş ilanı', jobTitle);

  const businessName = pickString(data, 'business_name', 'businessName');
  if (businessName) push('storefront-outline', 'İşletme', businessName);

  const amount = pickString(data, 'amount_label', 'amountLabel', 'price_label', 'priceLabel');
  if (amount) push('cash-outline', 'Tutar', amount);

  const eventName = pickString(data, 'event_name', 'eventName', 'event_title', 'eventTitle');
  if (eventName) push('calendar-outline', 'Etkinlik', eventName);

  const channelName = pickString(data, 'channel_name', 'channelName', 'channel_title', 'channelTitle');
  if (channelName) push('radio-outline', 'Kanal', channelName);

  if (data.is_group === true) {
    push('people-outline', 'Mesaj', 'Grup sohbeti');
  }

  const senderLabel = pickString(data, 'sender_label', 'senderLabel');
  if (senderLabel && senderLabel !== VORA_NOTIFICATION_SENDER) {
    push('person-outline', 'Gönderen', senderLabel);
  }

  const achievementKey = pickString(data, 'achievement_key', 'achievementKey');
  const achievementLabel =
    pickString(data, 'achievement_label', 'achievementLabel') ??
    (achievementKey ? ACHIEVEMENT_CONFIG[achievementKey]?.label ?? null : null);
  if (achievementLabel) push('trophy-outline', 'Başarım', achievementLabel);

  const achievementSource = pickString(data, 'achievement_source', 'achievementSource');
  if (achievementSource) push('flag-outline', 'Kaynak', achievementSource);

  return lines.slice(0, 5);
}

export function getNotificationBody(item: AppNotification): string {
  if (item.eventType !== 'achievement_earned') return item.body;

  const data = normalizeNotificationData(item.data);
  const achievementKey = pickString(data, 'achievement_key', 'achievementKey');
  const achievementLabel =
    pickString(data, 'achievement_label', 'achievementLabel') ??
    (achievementKey ? ACHIEVEMENT_CONFIG[achievementKey]?.label ?? null : null);
  const achievementSource = pickString(data, 'achievement_source', 'achievementSource');

  if (achievementLabel && achievementSource) {
    return `Tebrikler! ${achievementSource} sayesinde "${achievementLabel}" başarımını kazandınız.`;
  }

  return item.body;
}

export function getNotificationTitle(item: AppNotification): string {
  if (item.eventType !== 'achievement_earned') return item.title;

  const data = normalizeNotificationData(item.data);
  const achievementKey = pickString(data, 'achievement_key', 'achievementKey');
  const achievementLabel =
    pickString(data, 'achievement_label', 'achievementLabel') ??
    (achievementKey ? ACHIEVEMENT_CONFIG[achievementKey]?.label ?? null : null);

  if (achievementLabel) {
    return `"${achievementLabel}" başarımı kazandınız`;
  }

  return item.title;
}

export function getNotificationActionLabel(item: AppNotification): string {
  if (isEmergencyNotification(item)) return 'Acil detayı aç';

  if (isRideNotificationEvent(item.eventType)) {
    return getRideNotificationActionLabel(item.eventType, normalizeNotificationData(item.data));
  }

  const data = normalizeNotificationData(item.data);
  if (isIzdivacNotificationEvent(item.eventType, data)) {
    return getIzdivacNotificationActionLabel(item.eventType, data);
  }

  if (item.eventType === 'marketplace_payout_due' || item.eventType === 'marketplace_payout_completed') {
    return 'Satış hesabını aç';
  }
  if (item.eventType === 'hotel_payout_due' || item.eventType === 'hotel_payout_completed') {
    return 'Cüzdanı aç';
  }
  if (
    item.eventType === 'trust_score_change' ||
    item.eventType === 'friend_invite_referral' ||
    item.eventType === 'trust_milestone_80' ||
    item.eventType === 'trust_reward_pool'
  ) {
    return 'Cüzdanı aç';
  }
  if (item.eventType === 'account_link_request') return 'Onay bekliyor';
  if (item.eventType === 'account_link_accepted') return 'Profili aç';
  if (item.eventType === 'account_link_declined') return 'Ayarları aç';

  const targets = extractTargetIds(item.data);
  if (targets.postId) return 'Gönderiyi aç';
  if (targets.reelId) return 'Reels\'i aç';
  if (targets.conversationId) return 'Sohbeti aç';
  if (targets.jobId) return 'İş ilanını aç';
  if (targets.tripId) return 'Yolculuğu aç';
  if (targets.reservationId) return 'Rezervasyonu aç';
  if (targets.eventId) return 'Etkinliği aç';
  if (targets.incidentId) return 'Olayı aç';
  if (targets.lostItemId) return 'İlanı aç';
  if (targets.listingId) return 'İlanı aç';
  if (targets.channelId) return 'Kanalı aç';
  if (targets.applicationId) return 'Başvuruyu aç';
  if (targets.callSessionId) return 'Aramayı gör';
  if (targets.actorId) return 'Profili aç';

  return 'Detayı aç';
}
