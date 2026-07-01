import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { Text } from '@/components/ui/Text';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
import type { StoryStickerCategoryId } from '@/features/stories/constants';
import { publishStory } from '@/features/stories/services/publishStory';
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
  const optimisticOwnRing = useStoryRingStore((s) => s.optimisticOwnRing);
  const [sticker, setSticker] = useState<StoryStickerCategoryId | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing) return;
    setPublishing(true);

    optimisticOwnRing({
      userId: user.id,
      username: user.user_metadata?.username ?? 'sen',
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      isVerified: false,
      storyId: 'optimistic',
      itemCount: 1,
      previewThumb: mediaUri,
      latestItemAt: new Date().toISOString(),
      hasUnseen: false,
      regionId: regionId ?? null,
    });

    const result = await publishStory({
      authorId: user.id,
      localUri: mediaUri,
      mediaType,
      durationSec,
      regionId: regionId ?? null,
      stickerCategory: sticker,
    });

    setPublishing(false);

    if (result.error) {
      Alert.alert('Hikaye paylaşılamadı', result.error);
      return;
    }

    router.replace('/(tabs)');
  }, [durationSec, mediaType, mediaUri, optimisticOwnRing, publishing, regionId, sticker, user]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
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
      </View>

      <Text variant="label" style={{ paddingHorizontal: spacing.md }}>
        Kategori (isteğe bağlı)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {STORY_STICKER_CATEGORIES.map((cat) => {
          const active = sticker === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}18` : colors.surfaceElevated,
                },
              ]}
              onPress={() => setSticker(active ? null : cat.id)}
            >
              <Ionicons name={cat.icon} size={14} color={active ? colors.primary : colors.textMuted} />
              <Text variant="caption" style={{ color: active ? colors.primary : colors.text }}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.publishBtn, { backgroundColor: colors.primary, opacity: publishing ? 0.7 : 1 }]}
        onPress={() => void handlePublish()}
        disabled={publishing}
      >
        {publishing ? (
          <ActivityIndicator color="#fff" />
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
    marginHorizontal: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    height: 420,
    marginBottom: spacing.md,
    backgroundColor: '#000',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  chips: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  publishBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
