import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type View as RNView,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { Text } from '@/components/ui/Text';
import { StoryFramingEditor } from '@/features/stories/components/StoryFramingEditor';
import { bakeStoryFramedImage } from '@/features/stories/services/bakeStoryFramedImage';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { routeStoryVideo, normalizeIncomingDurationSec } from '@/features/stories/services/routeStoryVideo';
import { publishStory } from '@/features/stories/services/publishStory';
import { stabilizeStoryVideoUri } from '@/features/stories/services/stabilizeStoryMedia';
import type { UploadStoryMediaProgress } from '@/features/stories/services/uploadStoryMedia';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import {
  DEFAULT_STORY_FRAMING,
  probeImageSize,
  probeVideoSize,
  STORY_FRAMING_BACKGROUNDS,
  type StoryFraming,
} from '@/features/stories/utils/storyFraming';
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
  const normalizedDurationSec = normalizeIncomingDurationSec(durationSec);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const setRings = useStoryRingStore((s) => s.setRings);
  const captureRef = useRef<RNView>(null);

  const [publishing, setPublishing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [publishUri, setPublishUri] = useState(mediaUri);
  const [mediaPreparing, setMediaPreparing] = useState(mediaType === 'video');
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);
  const [framing, setFraming] = useState<StoryFraming>(DEFAULT_STORY_FRAMING);

  useEffect(() => {
    setPublishUri(mediaUri);
  }, [mediaUri]);

  useEffect(() => {
    if (mediaType !== 'video') return;

    let cancelled = false;

    void (async () => {
      const probed = await probeVideoDuration(mediaUri);
      if (cancelled) return;
      if (probed > STORY_MAX_VIDEO_SEC) {
        try {
          await routeStoryVideo(mediaUri, probed);
        } catch (err) {
          Alert.alert(
            'Video hazırlanamadı',
            err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUri]);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const size =
          mediaType === 'image'
            ? await probeImageSize(publishUri)
            : await probeVideoSize(publishUri);
        if (cancelled) return;
        setMediaSize(size);
        setFraming((prev) => ({
          ...prev,
          mediaWidth: size.width,
          mediaHeight: size.height,
        }));
      } catch {
        if (!cancelled) {
          setMediaSize({ width: 1080, height: 1920 });
        }
      }
    };

    void probe();
    return () => {
      cancelled = true;
    };
  }, [mediaType, publishUri]);

  useEffect(() => {
    if (mediaType !== 'video') {
      setMediaPreparing(false);
      return;
    }

    let cancelled = false;
    setMediaPreparing(true);

    void stabilizeStoryVideoUri(mediaUri)
      .then((stable) => {
        if (cancelled) return;
        setPublishUri(stable);
        useStoryPublishStore.getState().setDraft({
          mediaUri: stable,
          mediaType: 'video',
          durationSec: normalizedDurationSec,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        Alert.alert(
          'Video hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
      })
      .finally(() => {
        if (!cancelled) setMediaPreparing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUri, normalizedDurationSec]);

  const handleFramingChange = useCallback((next: StoryFraming) => {
    setFraming(next);
  }, []);

  const handleBackgroundPick = useCallback((color: string) => {
    setFraming((prev) => ({ ...prev, backgroundColor: color }));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing || mediaPreparing || !mediaSize) return;
    setPublishing(true);
    setUploadMessage(mediaType === 'video' ? 'Video hazırlanıyor…' : 'Görsel hazırlanıyor…');

    let uploadUri = publishUri;
    let uploadFraming: StoryFraming | null = null;

    if (mediaType === 'image') {
      try {
        uploadUri = await bakeStoryFramedImage(captureRef.current);
      } catch (err) {
        setPublishing(false);
        setUploadMessage(null);
        Alert.alert(
          'Görsel hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
        return;
      }
    } else {
      uploadFraming = {
        ...framing,
        mediaWidth: mediaSize.width,
        mediaHeight: mediaSize.height,
      };
    }

    const result = await publishStory({
      authorId: user.id,
      localUri: uploadUri,
      mediaType,
      durationSec: normalizedDurationSec,
      regionId: regionId ?? null,
      stickerCategory: null,
      framing: uploadFraming,
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
  }, [
    normalizedDurationSec,
    framing,
    mediaPreparing,
    mediaSize,
    mediaType,
    publishUri,
    publishing,
    regionId,
    setRings,
    user,
  ]);

  const canEditFraming = !mediaPreparing && mediaSize != null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} disabled={publishing}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text variant="title">Hikaye paylaş</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text variant="caption" style={[styles.hint, { color: colors.textMuted }]}>
        İki parmakla yakınlaştırın veya uzaklaştırın · Çift dokun: sığdır
      </Text>

      <View ref={captureRef} collapsable={false} style={styles.previewWrap}>
        {canEditFraming ? (
          <StoryFramingEditor
            framing={framing}
            onFramingChange={handleFramingChange}
            mediaWidth={mediaSize.width}
            mediaHeight={mediaSize.height}
            enabled={!publishing}
          >
            {mediaType === 'image' ? (
              <Image source={{ uri: publishUri }} style={styles.mediaFill} contentFit="cover" />
            ) : (
              <CapturedVideoPreview uri={publishUri} style={styles.mediaFill} contentFit="cover" />
            )}
          </StoryFramingEditor>
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text variant="caption" style={{ color: colors.textMuted, marginTop: spacing.sm }}>
              {mediaType === 'video' ? 'Video hazırlanıyor…' : 'Medya yükleniyor…'}
            </Text>
          </View>
        )}
        {mediaType === 'video' && normalizedDurationSec ? (
          <View style={styles.durationBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
            <Text variant="caption" style={styles.durationText}>
              {Math.round(normalizedDurationSec)} sn
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
        style={styles.colorScroll}
      >
        {STORY_FRAMING_BACKGROUNDS.map((color) => {
          const selected = framing.backgroundColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => handleBackgroundPick(color)}
              disabled={publishing}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            />
          );
        })}
      </ScrollView>

      {uploadMessage ? (
        <Text variant="caption" style={[styles.uploadHint, { color: colors.textMuted }]}>
          {uploadMessage}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.publishBtn,
          {
            backgroundColor: colors.primary,
            opacity: publishing || mediaPreparing || !mediaSize ? 0.7 : 1,
          },
        ]}
        onPress={() => void handlePublish()}
        disabled={publishing || mediaPreparing || !mediaSize}
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
  hint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  previewWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 22,
    overflow: 'hidden',
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  previewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
  colorScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  colorRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
