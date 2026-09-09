import { SUBSCRIPTIONS_ENABLED } from '@/features/profile/constants/subscriptionsConfig';
import { STORIES_ENABLED } from '@/features/stories/constants';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';

export function isFeatureForcedHidden(featureId: string): boolean {
  if (featureId === 'premium' && !SUBSCRIPTIONS_ENABLED) return true;
  if (featureId === 'tip-line' && !TIP_LINE_ENABLED) return true;
  if (!STORIES_ENABLED) {
    if (featureId === 'stories' || featureId.startsWith('stories.')) return true;
    // Ayarlar menüsü altında; parent'ı settings olduğu için ayrıca kapatılır.
    if (featureId === 'settings.section.story-archive') return true;
  }
  return false;
}
