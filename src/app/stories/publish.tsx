import { useLocalSearchParams } from 'expo-router';
import { StoryPublishScreen } from '@/features/stories/components/StoryPublishScreen';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';

export default function StoryPublishRoute() {
  const draft = useStoryPublishStore((s) => s.draft);
  const params = useLocalSearchParams<{
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    durationSec?: string;
  }>();

  const mediaUri = draft?.mediaUri ?? params.mediaUri;
  const mediaType = draft?.mediaType ?? params.mediaType;
  const durationSec =
    draft?.durationSec ?? (params.durationSec ? Number(params.durationSec) : undefined);

  if (!mediaUri || !mediaType) return null;

  return (
    <StoryPublishScreen
      mediaUri={mediaUri}
      mediaType={mediaType}
      durationSec={durationSec}
    />
  );
}
