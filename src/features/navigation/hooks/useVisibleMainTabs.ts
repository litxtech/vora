import { useMemo } from 'react';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { MAIN_TAB_SWIPE_ORDER, type MainTabRoute } from '@/features/navigation/constants';

export function useVisibleMainTabs(): MainTabRoute[] {
  const { isVisible } = useFeatureFlags();

  return useMemo(
    () =>
      MAIN_TAB_SWIPE_ORDER.filter((tab) => isVisible(tab.featureId)).map((tab) => tab.route),
    [isVisible],
  );
}
