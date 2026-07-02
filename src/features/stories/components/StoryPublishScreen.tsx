import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { MediaEditorLocationSheet } from '@/features/compose/components/MediaEditorLocationSheet';
import { MediaEditorMusicPanel } from '@/features/compose/components/MediaEditorMusicPanel';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { AudioPickerSheet } from '@/features/sounds/components/AudioPickerSheet';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicSelection } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { StoryBackgroundSheet } from '@/features/stories/components/StoryBackgroundSheet';
import { StoryFramingEditor } from '@/features/stories/components/StoryFramingEditor';
import { StoryLinkEditor } from '@/features/stories/components/StoryLinkEditor';
import { StoryLinkSheet } from '@/features/stories/components/StoryLinkSheet';
import {
  StoryPublishRail,
  type StoryPublishToolId,
} from '@/features/stories/components/StoryPublishRail';
import { StoryStickerSheet } from '@/features/stories/components/StoryStickerSheet';
import { bakeStoryFramedImage } from '@/features/stories/services/bakeStoryFramedImage';
import { STORY_MAX_VIDEO_SEC, type StoryStickerCategoryId } from '@/features/stories/constants';
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
  createStoryFramingForMedia,
  type StoryFraming,
} from '@/features/stories/utils/storyFraming';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type StoryFlowPhase = 'edit' | 'preview';

type StoryPublishScreenProps = {
  mediaUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
  trimmedInStudio?: boolean;
};

export function StoryPublishScreen({
  mediaUri,
  mediaType,
  durationSec,
  trimmedInStudio = false,
}: StoryPublishScreenProps) {
  const normalizedDurationSec = normalizeIncomingDurationSec(durationSec);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const setRings = useStoryRingStore((s) => s.setRings);
  const captureRef = useRef<RNView>(null);

  const musicSelection = useMusicSelectionStore((s) => s.selection);
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);

  const [publishing, setPublishing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [publishUri, setPublishUri] = useState(mediaUri);
  const [stabilizing, setStabilizing] = useState(false);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);
  const [framing, setFraming] = useState<StoryFraming>(DEFAULT_STORY_FRAMING);
  const [activeTool, setActiveTool] = useState<StoryPublishToolId | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicPreviewPlaying, setMusicPreviewPlaying] = useState(false);
  const [stickerCategory, setStickerCategory] = useState<StoryStickerCategoryId | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [links, setLinks] = useState<StoryLinkManifest[]>([]);
  const [flowPhase, setFlowPhase] = useState<StoryFlowPhase>('edit');

  const isCleanPreview = flowPhase === 'preview';
  const storyVideoClipSec =
    normalizedDurationSec != null && normalizedDurationSec > 0
      ? normalizedDurationSec
      : (musicSelection?.durationSec ?? 15);
  const showPublishButton = !musicSelection || isCleanPreview;

  useEffect(() => {
    useMusicSelectionStore.getState().clearSelection();
    return () => {
      useMusicSelectionStore.getState().clearSelection();
    };
  }, []);

  useEffect(() => {
    setPublishUri(mediaUri);
  }, [mediaUri]);

  useEffect(() => {
    if (mediaType !== 'video' || trimmedInStudio) return;

    const knownDuration = normalizedDurationSec;
    if (knownDuration != null && knownDuration > 0 && knownDuration <= STORY_MAX_VIDEO_SEC) {
      return;
    }

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
  }, [mediaType, mediaUri, normalizedDurationSec, trimmedInStudio]);

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
        setFraming((prev) =>
          createStoryFramingForMedia(size.width, size.height, {
            backgroundColor: prev.backgroundColor,
          }),
        );
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
    if (mediaType !== 'video') return;

    let cancelled = false;
    setStabilizing(true);

    void stabilizeStoryVideoUri(mediaUri)
      .then((stable) => {
        if (cancelled) return;
        setPublishUri(stable);
        useStoryPublishStore.getState().setDraft({
          mediaUri: stable,
          mediaType: 'video',
          durationSec: normalizedDurationSec,
          trimmedInStudio,
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
        if (!cancelled) setStabilizing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUri, normalizedDurationSec, trimmedInStudio]);

  const handleFramingChange = useCallback((next: StoryFraming) => {
    setFraming(next);
  }, []);

  const handleToolPress = useCallback(
    (tool: StoryPublishToolId) => {
      if (tool === 'music') {
        if (musicSelection) {
          setFlowPhase('edit');
          setActiveTool('music');
          setMusicOpen(false);
          setMusicPreviewPlaying(true);
          return;
        }
        setActiveTool(null);
        setMusicOpen(true);
        return;
      }

      setMusicOpen(false);

      if (tool === 'sticker') {
        setActiveTool(activeTool === 'sticker' ? null : 'sticker');
        return;
      }

      if (tool === 'link') {
        setActiveTool(activeTool === 'link' ? null : 'link');
        return;
      }

      if (tool === 'location') {
        setActiveTool(activeTool === 'location' ? null : 'location');
        return;
      }

      if (tool === 'background') {
        setActiveTool(activeTool === 'background' ? null : 'background');
      }
    },
    [activeTool, mediaType, musicSelection],
  );

  const handleMusicSelect = useCallback(
    (selection: MusicSelection) => {
      const videoLen =
        normalizedDurationSec != null && normalizedDurationSec > 0
          ? normalizedDurationSec
          : selection.durationSec;
      const clipDuration = mediaType === 'video'
        ? Math.min(selection.durationSec, videoLen)
        : photoPostMusicEndSec(0, selection.durationSec);

      setMusicSelection({
        ...selection,
        musicStartSec: 0,
        musicEndSec: clipDuration,
        musicVolume: 0.85,
        originalAudioVolume: mediaType === 'video' ? 0.15 : 0,
      });
      setMusicOpen(false);
      setFlowPhase('edit');
      setActiveTool('music');
      setMusicPreviewPlaying(true);
    },
    [mediaType, normalizedDurationSec, setMusicSelection],
  );

  const handleMusicTrimDone = useCallback(() => {
    setMusicOpen(false);
    setActiveTool(null);
    setFlowPhase('preview');
    setMusicPreviewPlaying(true);
  }, []);

  const handleExitPreview = useCallback(() => {
    setFlowPhase('edit');
    setMusicPreviewPlaying(false);
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (isCleanPreview) {
      handleExitPreview();
      return;
    }
    if (activeTool != null) {
      setActiveTool(null);
      setMusicOpen(false);
      return;
    }
    router.back();
  }, [activeTool, handleExitPreview, isCleanPreview]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing || !mediaSize) return;
    if (mediaType === 'video' && stabilizing) return;

    setPublishing(true);
    setUploadMessage(mediaType === 'video' ? 'Video yükleniyor…' : 'Görsel hazırlanıyor…');

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
      stickerCategory,
      framing: uploadFraming,
      music: musicSelection,
      location: selectedLocation,
      links,
      trimmedInStudio,
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
    useMusicSelectionStore.getState().clearSelection();

    const refreshed = await fetchStoryRings({ viewerId: user.id });
    setRings(refreshed.rings);

    router.replace('/(tabs)');
  }, [
    normalizedDurationSec,
    framing,
    mediaSize,
    mediaType,
    musicSelection,
    publishUri,
    publishing,
    regionId,
    selectedLocation,
    links,
    setRings,
    stabilizing,
    stickerCategory,
    trimmedInStudio,
    user,
  ]);

  const canEditFraming = mediaSize != null;
  const previewMusicConfig = musicSelection
    ? {
        audioUrl: musicSelection.audioUrl,
        musicStartSec: musicSelection.musicStartSec,
        musicEndSec: musicSelection.musicEndSec,
        musicVolume: musicSelection.musicVolume,
        originalAudioVolume: musicSelection.originalAudioVolume,
      }
    : null;

  useStandaloneMusicPlayer({
    config: previewMusicConfig,
    scopeActive: mediaType === 'image' && Boolean(musicSelection),
    playing: mediaType === 'image' && musicPreviewPlaying && Boolean(musicSelection),
  });

  const framingEnabled = !publishing && !isCleanPreview;

  return (
    <View style={[styles.root, { backgroundColor: '#000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleHeaderBack} hitSlop={10} disabled={publishing}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          {isCleanPreview ? 'Önizleme' : 'Hikaye paylaş'}
        </Text>
        {isCleanPreview ? (
          <Pressable onPress={handleExitPreview} hitSlop={10} disabled={publishing}>
            <Text variant="caption" style={styles.editLink}>
              Düzenle
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <View
        ref={captureRef}
        collapsable={false}
        style={[styles.previewWrap, isCleanPreview && styles.previewWrapClean]}
      >
        {canEditFraming ? (
          <StoryFramingEditor
            framing={framing}
            onFramingChange={handleFramingChange}
            mediaWidth={mediaSize.width}
            mediaHeight={mediaSize.height}
            enabled={framingEnabled}
          >
            {mediaType === 'image' ? (
              <Image source={{ uri: publishUri }} style={styles.mediaFill} contentFit="cover" />
            ) : (
              <CapturedVideoPreview
                uri={publishUri}
                style={styles.mediaFill}
                contentFit="cover"
                music={musicSelection}
                videoMuted={musicSelection ? musicSelection.originalAudioVolume <= 0.001 : false}
              />
            )}
          </StoryFramingEditor>
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {selectedLocation ? (
          <View style={styles.locationPreview}>
            <Ionicons name="location" size={13} color="#fff" />
            <Text variant="caption" style={styles.locationPreviewText} numberOfLines={1}>
              {selectedLocation.label}
            </Text>
          </View>
        ) : null}

        {mediaType === 'video' && normalizedDurationSec && !isCleanPreview ? (
          <View style={styles.durationBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
            <Text variant="caption" style={styles.durationText}>
              {Math.round(normalizedDurationSec)} sn
            </Text>
          </View>
        ) : null}

        {stabilizing && !isCleanPreview ? (
          <View style={styles.stabilizeBadge}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : null}

        <StoryLinkEditor
          links={links}
          onLinksChange={setLinks}
          enabled={framingEnabled}
        />
      </View>

      {musicSelection && isCleanPreview ? (
        <View style={styles.musicPreviewChip}>
          <Ionicons name="musical-notes" size={13} color="#fff" />
          <Text variant="caption" style={styles.musicPreviewChipText} numberOfLines={1}>
            {musicSelection.displayTitle}
          </Text>
        </View>
      ) : null}

      {!isCleanPreview ? (
        <StoryPublishRail
          activeTool={activeTool}
          hasMusic={Boolean(musicSelection)}
          hasSticker={Boolean(stickerCategory)}
          hasLocation={Boolean(selectedLocation)}
          hasLinks={links.length > 0}
          onPress={handleToolPress}
        />
      ) : null}

      {uploadMessage ? (
        <Text variant="caption" style={styles.uploadHint}>
          {uploadMessage}
        </Text>
      ) : null}

      {showPublishButton ? (
        <Pressable
          style={[
            styles.publishBtn,
            {
              backgroundColor: colors.primary,
              opacity: publishing || !mediaSize || stabilizing ? 0.7 : 1,
            },
          ]}
          onPress={() => void handlePublish()}
          disabled={publishing || !mediaSize || stabilizing}
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
      ) : musicSelection ? (
        <Text variant="caption" style={styles.previewHint}>
          Müziği kırpıp önizlemeye geçin
        </Text>
      ) : null}

      <AudioPickerSheet
        visible={musicOpen}
        selectedTrackId={musicSelection?.trackId ?? null}
        initialMode="music"
        onClose={() => {
          setMusicOpen(false);
          if (!musicSelection) setActiveTool(null);
        }}
        onSelect={handleMusicSelect}
      />

      {musicSelection ? (
        <MediaEditorMusicPanel
          visible={activeTool === 'music' && !isCleanPreview}
          mediaType={mediaType}
          clipDurationSec={mediaType === 'video' ? storyVideoClipSec : undefined}
          music={musicSelection}
          previewPlaying={musicPreviewPlaying}
          onTogglePreview={() => setMusicPreviewPlaying((v) => !v)}
          onChangeTrack={() => setMusicOpen(true)}
          onRemove={() => {
            setMusicSelection(null);
            setActiveTool(null);
            setMusicPreviewPlaying(false);
            setFlowPhase('edit');
          }}
          onUpdate={(patch) => {
            if (musicSelection) setMusicSelection({ ...musicSelection, ...patch });
          }}
          onClose={() => setActiveTool(null)}
          onDone={handleMusicTrimDone}
        />
      ) : null}

      <StoryStickerSheet
        visible={activeTool === 'sticker'}
        selected={stickerCategory}
        onSelect={setStickerCategory}
        onClose={() => setActiveTool(null)}
      />

      <StoryBackgroundSheet
        visible={activeTool === 'background'}
        selected={framing.backgroundColor}
        onSelect={(color) => setFraming((prev) => ({ ...prev, backgroundColor: color }))}
        onClose={() => setActiveTool(null)}
      />

      <MediaEditorLocationSheet
        visible={activeTool === 'location'}
        regionId={resolveMarketplaceRegionId(regionId)}
        value={selectedLocation}
        onChange={setSelectedLocation}
        onClose={() => setActiveTool(null)}
      />

      <StoryLinkSheet
        visible={activeTool === 'link'}
        links={links}
        onChange={setLinks}
        onClose={() => setActiveTool(null)}
      />
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
  headerTitle: {
    color: '#fff',
  },
  editLink: {
    color: '#fff',
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  previewWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 22,
    overflow: 'hidden',
  },
  previewWrapClean: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: 0,
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  previewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  durationBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
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
  stabilizeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPreview: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '70%',
  },
  locationPreviewText: {
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
  },
  uploadHint: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    color: 'rgba(255,255,255,0.7)',
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
  musicPreviewChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '80%',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  musicPreviewChipText: {
    color: '#fff',
    fontWeight: '600',
    flexShrink: 1,
  },
  previewHint: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    color: 'rgba(255,255,255,0.65)',
  },
});
