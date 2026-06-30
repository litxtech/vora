import { useCallback } from 'react';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { useIzdivacAccess } from '@/features/izdivac/hooks/useIzdivacAccess';
import type { CenterId } from '@/features/centers/types';

/** Merkez kartının kullanıcıya gösterilip gösterilmeyeceği (özellik bayrağı + kullanıcı erişimi). */
export function useCenterEntryVisible() {
  const { isVisible } = useFeatureFlags();
  const izdivacAccess = useIzdivacAccess();

  return useCallback(
    (centerId: CenterId) => {
      if (centerId === 'izdivac-center') return izdivacAccess;
      return isVisible(centerId);
    },
    [isVisible, izdivacAccess],
  );
}
