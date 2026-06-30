import { router } from 'expo-router';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FeedIconButton } from '@/features/feed/components/shared/FeedIconButton';

type MapHeaderButtonProps = {
  compact?: boolean;
};

export function MapHeaderButton({ compact = true }: MapHeaderButtonProps) {
  const showMap = useFeatureVisible('map');

  if (!showMap) return null;

  return (
    <FeedIconButton
      icon="map-outline"
      accent
      compact={compact}
      onPress={() => router.push('/(tabs)/map' as never)}
    />
  );
}
