import { SUBSCRIPTIONS_ENABLED } from '@/features/profile/constants/subscriptionsConfig';

/** Satın alma ekranları, upsell kartları ve premium navigasyonu gösterilsin mi? */
export function subscriptionsCommerceEnabled(): boolean {
  return SUBSCRIPTIONS_ENABLED;
}

/** Premium ile kilitlenen özelliklere erişim (abonelik kapalıyken herkes). */
export function hasPremiumEntitlement(isPremium?: boolean | null): boolean {
  if (!SUBSCRIPTIONS_ENABLED) return true;
  return isPremium === true;
}

/** Profilde altın rozet / elmas gösterilsin mi? */
export function showPremiumBadge(isPremium?: boolean | null): boolean {
  if (!SUBSCRIPTIONS_ENABLED) return false;
  return isPremium === true;
}
