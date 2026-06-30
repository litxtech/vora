import { useMemo } from 'react';
import { featureTabId } from '@/features/feature-flags/buildSubFeatures';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';

type TabLike<T extends string> = { id: T };

/**
 * Üst sekme altındaki alt sekmeleri filtreler.
 * Örn. `useNestedFeatureTabFilter('help.tab.requests', HELP_TABS)`
 */
export function useNestedFeatureTabFilter<T extends string, U extends TabLike<T>>(
  parentFeatureId: string,
  tabs: U[],
  extraFilter?: (tab: U) => boolean,
): U[] {
  const { isVisible } = useFeatureFlags();

  return useMemo(() => {
    return tabs.filter((tab) => {
      if (extraFilter && !extraFilter(tab)) return false;
      return isVisible(featureTabId(parentFeatureId, tab.id));
    });
  }, [tabs, extraFilter, isVisible, parentFeatureId]);
}
