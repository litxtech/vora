import type { ReactNode } from 'react';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import type { FeatureId } from '@/features/feature-flags/types';

type FeatureGateProps = {
  featureId: FeatureId;
  children: ReactNode;
  fallback?: ReactNode;
};

export function FeatureGate({ featureId, children, fallback = null }: FeatureGateProps) {
  const visible = useFeatureVisible(featureId);
  if (!visible) return <>{fallback}</>;
  return <>{children}</>;
}
