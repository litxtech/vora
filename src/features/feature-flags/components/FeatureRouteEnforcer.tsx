import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { resolveFeatureForPath } from '@/features/feature-flags/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { resolveDefaultTabHref } from '@/features/feature-flags/resolveDefaultTabHref';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';

/** Gizli özellik rotalarına doğrudan erişimi engeller. */
export function FeatureRouteEnforcer() {
  const pathname = usePathname();
  const featureId = resolveFeatureForPath(pathname);
  const visible = useFeatureVisible(featureId ?? '');
  const { isVisible } = useFeatureFlags();

  useEffect(() => {
    if (!featureId || visible) return;
    const fallback = resolveDefaultTabHref(isVisible);
    if (fallback === pathname) return;
    router.replace(fallback as never);
  }, [featureId, visible, pathname, isVisible]);

  return null;
}
