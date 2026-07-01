import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StoryPublishScreen } from '@/features/stories/components/StoryPublishScreen';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';

export default function StoryPublishRoute() {
  const draft = useStoryPublishStore((s) => s.draft);
  const params = useLocalSearchParams<{
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    durationSec?: string;
    trimmedInStudio?: string;
  }>();

  const mediaUri = draft?.mediaUri ?? params.mediaUri;
  const mediaType = draft?.mediaType ?? params.mediaType;
  const durationSec =
    draft?.durationSec ?? (params.durationSec ? Number(params.durationSec) : undefined);
  const trimmedInStudio =
    draft?.trimmedInStudio ??
    (params.trimmedInStudio === '1' || params.trimmedInStudio === 'true');

  if (!mediaUri || !mediaType) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color="#fff" />
        <Text variant="caption" style={styles.fallbackText}>
          Hikâye hazırlanıyor…
        </Text>
      </View>
    );
  }

  return (
    <StoryPublishScreen
      mediaUri={mediaUri}
      mediaType={mediaType}
      durationSec={durationSec}
      trimmedInStudio={trimmedInStudio}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    gap: spacing.sm,
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.7)',
  },
});
