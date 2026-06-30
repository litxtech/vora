import { router } from 'expo-router';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FeedIconButton } from '@/features/feed/components/shared/FeedIconButton';
import { useActiveIncidentCount } from '@/features/incidents/hooks/useActiveIncidentCount';
import type { RegionId } from '@/constants/regions';
import { useAuth } from '@/providers/AuthProvider';

type IncidentsHeaderButtonProps = {
  regionId?: RegionId | null;
  compact?: boolean;
};

export function IncidentsHeaderButton({ regionId, compact = true }: IncidentsHeaderButtonProps) {
  const visible = useFeatureVisible('incident-graph');
  const { profile } = useAuth();
  const resolvedRegion = regionId ?? (profile?.region_id as RegionId | undefined) ?? null;
  const { count } = useActiveIncidentCount(resolvedRegion);

  if (!visible) return null;

  return (
    <FeedIconButton
      icon="pulse"
      accent={count > 0}
      badge={count > 0 ? count : undefined}
      compact={compact}
      onPress={() => router.push('/incidents' as never)}
    />
  );
}
