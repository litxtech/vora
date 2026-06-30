import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { FeatureId } from '@/features/feature-flags/types';

/** Özellik kapalıysa tüm kullanıcılar için false döner (rol ayrımı yok). */
export function useFeatureVisible(featureId: FeatureId | null | undefined): boolean {
  const { isVisible } = useFeatureFlags();
  if (!featureId) return true;
  return isVisible(featureId);
}
