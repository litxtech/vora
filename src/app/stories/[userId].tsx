import { useLocalSearchParams } from 'expo-router';
import { StoryViewerScreen } from '@/features/stories/components/StoryViewerScreen';

export default function StoryViewerRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  if (!userId) return null;
  return <StoryViewerScreen userId={userId} />;
}
