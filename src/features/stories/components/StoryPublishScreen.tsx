import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { Text } from '@/components/ui/Text';
import { publishStory } from '@/features/stories/services/publishStory';
import type { UploadStoryMediaProgress } from '@/features/stories/services/uploadStoryMedia';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type StoryPublishScreenProps = {
  mediaUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
};

export function StoryPublishScreen({ mediaUri, mediaType, durationSec }: StoryPublishScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const setRings = useStoryRingStore((s) => s.setRings);
  const [publishing, setPublishing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing) return;
    setPublishing(true);
    setUploadMessage(mediaType === 'video' ? 'Video hazırlanıyor…' : null);

    const result = await publishStory({
      authorId: user.id,
      localUri: mediaUri,
      mediaType,
      durationSec,
      regionId: regionId ?? null,
      stickerCategory: null,
      onUploadProgress: (progress: UploadStoryMediaProgress) => {
        setUploadMessage(progress.message);
      },
    });

    setPublishing(false);
    setUploadMessage(null);

    if (result.error) {
      Alert.alert('Hikaye paylaşılamadı', result.error);
      return;
    }

    useStoryPublishStore.getState().clearDraft();

    const refreshed = await fetchStoryRings({ viewerId: user.id });
    setRings(refreshed.rings);

    router.replace('/(tabs)');
  }, [durationSec, mediaType, mediaUri, publishing, regionId, setRings, user]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} disabled={publishing}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text variant="title">Hikaye paylaş</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.previewWrap}>
        {mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <CapturedVideoPreview uri={mediaUri} style={styles.preview} />
        )}
        {mediaType === 'video' && durationSec ? (
          <View style={styles.durationBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
            <Text variant="caption" style={styles.durationText}>
              {Math.round(durationSec)} sn
            </Text>
          </View>
        ) : null}
      </View>

      {uploadMessage ? (
        <Text variant="caption" style={[styles.uploadHint, { color: colors.textMuted }]}>
          {uploadMessage}
        </Text>
      ) : null}

      <Pressable
        style={[styles.publishBtn, { backgroundColor: colors.primary, opacity: publishing ? 0.7 : 1 }]}
        onPress={() => void handlePublish()}
        disabled={publishing}
      >
        {publishing ? (
          <View style={styles.publishingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text variant="label" style={{ color: '#fff' }}>
              {uploadMessage ?? 'Paylaşılıyor…'}
            </Text>
          </View>
        ) : (
          <Text variant="label" style={{ color: '#fff' }}>
            Hikayeyi paylaş
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  previewWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  durationText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  uploadHint: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  publishBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  publishingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
