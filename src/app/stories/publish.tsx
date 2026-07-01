import { useLocalSearchParams } from 'expo-router';
import { StoryPublishScreen } from '@/features/stories/components/StoryPublishScreen';

export default function StoryPublishRoute() {
  const params = useLocalSearchParams<{
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    durationSec?: string;
  }>();

  if (!params.mediaUri || !params.mediaType) return null;

  return (
    <StoryPublishScreen
      mediaUri={params.mediaUri}
      mediaType={params.mediaType}
      durationSec={params.durationSec ? Number(params.durationSec) : undefined}
    />
  );
}
