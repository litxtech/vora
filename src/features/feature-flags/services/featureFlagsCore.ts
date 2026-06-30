import { SUBSCRIPTIONS_ENABLED } from '@/features/profile/constants/subscriptionsConfig';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';

export function isFeatureForcedHidden(featureId: string): boolean {
  if (featureId === 'premium' && !SUBSCRIPTIONS_ENABLED) return true;
  if (featureId === 'tip-line' && !TIP_LINE_ENABLED) return true;
  return false;
}
