import type { FeatureId } from '@/features/feature-flags/types';

const TAB_FALLBACK_ORDER: { id: FeatureId; href: '/(tabs)' | '/(tabs)/discover' | '/(tabs)/reels' | '/(tabs)/messages' | '/(tabs)/profile' | '/(tabs)/centers' }[] = [
  { id: 'feed', href: '/(tabs)' },
  { id: 'discover', href: '/(tabs)/discover' },
  { id: 'centers-hub', href: '/(tabs)' },
  { id: 'reels', href: '/(tabs)/reels' },
  { id: 'messages', href: '/(tabs)/messages' },
  { id: 'profile', href: '/(tabs)/profile' },
];

/** Gizli sekme rotasından çıkış için ilk görünür tab. */
export function resolveDefaultTabHref(isVisible: (featureId: FeatureId) => boolean): string {
  for (const tab of TAB_FALLBACK_ORDER) {
    if (isVisible(tab.id)) return tab.href;
  }
  return '/(tabs)';
}
