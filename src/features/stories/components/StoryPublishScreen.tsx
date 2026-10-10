import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type View as RNView,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { AudioPickerSheet } from '@/features/sounds/components/AudioPickerSheet';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { useLockStackBackGesture } from '@/features/music/hooks/useLockStackBackGesture';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicSelection } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { musicSelectionToManifest } from '@/features/stories/utils/storyManifest';
import {
  DEFAULT_STORY_LOCATION_POSITION,
  type StoryLocationPosition,
} from '@/features/stories/utils/storyLocation';
import { PHOTO_POST_MUSIC_DURATION_SEC } from '@/features/music/constants';
import { StoryPublishCanvas } from '@/features/stories/components/StoryPublishCanvas';
import { StoryFramingEditor } from '@/features/stories/components/StoryFramingEditor';
import { StoryPublishMedia } from '@/features/stories/components/StoryPublishMedia';
import { useStoryCardMetrics } from '@/features/stories/hooks/useStoryCardMetrics';
import { StoryLinkEditor } from '@/features/stories/components/StoryLinkEditor';
import { StoryLinkSheet } from '@/features/stories/components/StoryLinkSheet';
import { StoryLocationEditor } from '@/features/stories/components/StoryLocationEditor';
import { StoryLocationSheet } from '@/features/stories/components/StoryLocationSheet';
import { StoryMusicBadge } from '@/features/stories/components/StoryMusicBadge';
import { StoryMusicInfoSheet } from '@/features/stories/components/StoryMusicInfoSheet';
import { StoryMusicStrip } from '@/features/stories/components/StoryMusicStrip';
import {
  StoryPublishRail,
  type StoryPublishToolId,
} from '@/features/stories/components/StoryPublishRail';
import { bakeStoryFramedImage } from '@/features/stories/services/bakeStoryFramedImage';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { routeStoryVideo, normalizeIncomingDurationSec } from '@/features/stories/services/routeStoryVideo';
import { useStoryUploadStore } from '@/features/stories/store/storyUploadStore';
import { documentDirectory } from 'expo-file-system/legacy';
import { getLocalFileSize, normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { prepareLocalImageUri, isPreparedLocalImageUri } from '@/lib/media/prepareLocalImage';
import { stabilizeStoryVideoUri } from '@/features/stories/services/stabilizeStoryMedia';
import { prepareStoryVideoPreviewUri } from '@/features/stories/services/prepareStoryVideoPreview';
import { probeVideoDuration } from '@/features/vora-studio';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
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
import { STORY_PUBLISH_BOTTOM_CHROME_HEIGHT, STORY_PUBLISH_HORIZONTAL_INSET, STORY_PUBLISH_RAIL_TOP_EXTRA } from '@/features/stories/constants';
import { fitStoryCardInStage } from '@/features/stories/utils/storyCardChrome';
import type { StoryCardMetrics } from '@/features/stories/hooks/useStoryCardMetrics';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type StoryPublishScreenProps = {
  mediaUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
  trimmedInStudio?: boolean;
  mediaWidth?: number;
  mediaHeight?: number;
};

function resolveInitialMediaSize(
  mediaWidth?: number,
  mediaHeight?: number,
): { width: number; height: number } | null {
  if (mediaWidth != null && mediaHeight != null && mediaWidth > 0 && mediaHeight > 0) {
    return { width: mediaWidth, height: mediaHeight };
  }
  return null;
}

export function StoryPublishScreen({
  mediaUri,
  mediaType,
  durationSec,
  trimmedInStudio = false,
  mediaWidth,
  mediaHeight,
}: StoryPublishScreenProps) {
  const normalizedDurationSec = normalizeIncomingDurationSec(durationSec);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user, profile } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const startStoryPublish = useStoryUploadStore((s) => s.startPublish);
  const storyUploadBusy = useStoryUploadStore(
    (s) => s.status === 'uploading' || (s.status === 'success' && s.videoUploadActive),
  );
  const captureRef = useRef<RNView>(null);

  const musicSelection = useMusicSelectionStore((s) => s.selection);
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);

  const [publishing, setPublishing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [publishUri, setPublishUri] = useState(() => normalizeLocalFileUri(mediaUri));
  const [stabilizing, setStabilizing] = useState(false);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number }>(() =>
    resolveInitialMediaSize(mediaWidth, mediaHeight) ?? {
      width: DEFAULT_STORY_FRAMING.mediaWidth,
      height: DEFAULT_STORY_FRAMING.mediaHeight,
    },
  );
  const [framing, setFraming] = useState<StoryFraming>(() => {
    const size = resolveInitialMediaSize(mediaWidth, mediaHeight);
    return size
      ? createStoryFramingForMedia(size.width, size.height)
      : DEFAULT_STORY_FRAMING;
  });
  const [activeTool, setActiveTool] = useState<StoryPublishToolId | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicEditing, setMusicEditing] = useState(false);
  useLockStackBackGesture(Boolean(musicSelection) && musicEditing);
  const [musicConfirmed, setMusicConfirmed] = useState(false);
  const [musicInfoOpen, setMusicInfoOpen] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [locationPosition, setLocationPosition] = useState<StoryLocationPosition>(
    DEFAULT_STORY_LOCATION_POSITION,
  );
  const [links, setLinks] = useState<StoryLinkManifest[]>([]);
  const [hideChromeForCapture, setHideChromeForCapture] = useState(false);
  const [imagePreviewReady, setImagePreviewReady] = useState(mediaType !== 'image');
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(44);

  const {
    metrics: cardMetrics,
    isReady: cardMetricsReady,
    onStageLayout,
  } = useStoryCardMetrics();

  const storyVideoClipSec =
    normalizedDurationSec != null && normalizedDurationSec > 0
      ? normalizedDurationSec
      : (musicSelection?.durationSec ?? 15);

  const musicClipDurationSec =
    mediaType === 'video'
      ? storyVideoClipSec
      : Math.min(PHOTO_POST_MUSIC_DURATION_SEC, musicSelection?.durationSec ?? PHOTO_POST_MUSIC_DURATION_SEC);

  const musicPlaysOnStory =
    Boolean(musicSelection) && !musicOpen && (musicEditing || musicConfirmed);

  const videoOriginalMuted = musicSelection
    ? musicSelection.originalAudioVolume <= 0.001
    : videoMuted;

  const musicManifest = musicSelection ? musicSelectionToManifest(musicSelection) : null;
  const musicAddedBy = useMemo(() => {
    if (!user) return null;
    const meta = user.user_metadata as { username?: string; full_name?: string } | undefined;
    return {
      userId: user.id,
      username: profile?.username ?? meta?.username ?? 'kullanici',
      fullName: profile?.full_name ?? meta?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      isVerified: profile?.is_verified ?? false,
    };
  }, [profile, user]);

  useEffect(() => {
    useMusicSelectionStore.getState().clearSelection();
    return () => {
      useMusicSelectionStore.getState().clearSelection();
    };
  }, []);

  useEffect(() => {
    if (mediaType !== 'video') return;
    setPublishUri((current) => {
      const next = normalizeLocalFileUri(mediaUri);
      return next || current;
    });
  }, [mediaType, mediaUri]);

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
      const fallback = resolveInitialMediaSize(mediaWidth, mediaHeight) ?? {
        width: 1080,
        height: 1920,
      };

      try {
        const size =
          mediaType === 'image'
            ? await probeImageSize(normalizeLocalFileUri(publishUri))
            : await probeVideoSize(normalizeLocalFileUri(publishUri));
        if (cancelled) return;
        setMediaSize(size);
        setFraming((prev) => {
          if (prev.mediaWidth === size.width && prev.mediaHeight === size.height) {
            return prev;
          }
          return createStoryFramingForMedia(size.width, size.height, {
            backgroundColor: prev.backgroundColor,
          });
        });
      } catch (err) {
        if (!cancelled) {
          setMediaSize(fallback);
          setFraming((prev) =>
            createStoryFramingForMedia(fallback.width, fallback.height, {
              backgroundColor: prev.backgroundColor,
            }),
          );
        }
      }
    };

    void probe();
    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaWidth, mediaHeight, publishUri]);

  useEffect(() => {
    if (mediaType !== 'image') return;

    const normalized = normalizeLocalFileUri(mediaUri);

    if (isPreparedLocalImageUri(normalized)) {
      if (publishUri !== normalized) {
        setPublishUri(normalized);
      }
      return;
    }

    let cancelled = false;

    void prepareLocalImageUri(mediaUri)
      .then((stable) => {
        if (cancelled) return;
        const normalizedStable = normalizeLocalFileUri(stable);
        setPublishUri(normalizedStable);
        const draft = useStoryPublishStore.getState().draft;
        if (draft?.mediaUri !== stable) {
          useStoryPublishStore.getState().setDraft({
            mediaUri: stable,
            mediaType: 'image',
            durationSec: normalizedDurationSec,
            mediaWidth,
            mediaHeight,
            trimmedInStudio,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        Alert.alert(
          'Fotoğraf hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [mediaHeight, mediaType, mediaUri, mediaWidth, normalizedDurationSec, trimmedInStudio]);

  useEffect(() => {
    if (mediaType !== 'video') return;

    let cancelled = false;
    setStabilizing(true);

    void (async () => {
      try {
        const previewUri = await prepareStoryVideoPreviewUri(mediaUri);
        if (cancelled) return;
        setPublishUri(previewUri);

        const alreadyStable =
          Boolean(documentDirectory) &&
          previewUri.includes(documentDirectory!) &&
          getLocalFileSize(previewUri) > 0;

        if (alreadyStable) return;

        const stableUri = await stabilizeStoryVideoUri(previewUri);
        if (cancelled) return;

        const normalizedStable = normalizeLocalFileUri(stableUri);
        if (normalizedStable !== previewUri) {
          setPublishUri(normalizedStable);
          useStoryPublishStore.getState().setDraft({
            mediaUri: normalizedStable,
            mediaType: 'video',
            durationSec: normalizedDurationSec,
            trimmedInStudio,
          });
        }
      } catch (err) {
        if (cancelled) return;
        Alert.alert(
          'Video hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
      } finally {
        if (!cancelled) setStabilizing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUri, normalizedDurationSec, trimmedInStudio]);

  const closeOtherTools = useCallback(() => {
    setMusicOpen(false);
    setMusicEditing(false);
    setActiveTool(null);
  }, []);

  const handleToggleVideoAudio = useCallback(() => {
    if (musicSelection) {
      const nextMuted = musicSelection.originalAudioVolume > 0.001;
      setMusicSelection({
        ...musicSelection,
        originalAudioVolume: nextMuted ? 0 : 1,
      });
      return;
    }
    setVideoMuted((muted) => !muted);
  }, [musicSelection, setMusicSelection]);

  const handleToolPress = useCallback(
    (tool: StoryPublishToolId) => {
      if (tool === 'audio') {
        handleToggleVideoAudio();
        return;
      }

      if (tool === 'music') {
        if (musicSelection) {
          setMusicEditing(true);
          setMusicOpen(false);
          setActiveTool(null);
          return;
        }
        closeOtherTools();
        setMusicOpen(true);
        return;
      }

      setMusicOpen(false);
      setMusicEditing(false);

      if (tool === 'link') {
        setActiveTool(activeTool === 'link' ? null : 'link');
        return;
      }

      if (tool === 'location') {
        setActiveTool(activeTool === 'location' ? null : 'location');
      }
    },
    [
      activeTool,
      closeOtherTools,
      handleToggleVideoAudio,
      musicSelection,
    ],
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
        originalAudioVolume: mediaType === 'video' ? 0 : 0,
      });
      setMusicConfirmed(false);
      setMusicOpen(false);
      setMusicEditing(true);
      setActiveTool(null);
    },
    [mediaType, normalizedDurationSec, setMusicSelection],
  );

  const handleMusicRangeChange = useCallback(
    (startSec: number, endSec: number) => {
      if (!musicSelection) return;
      setMusicSelection({
        ...musicSelection,
        musicStartSec: startSec,
        musicEndSec: endSec,
      });
    },
    [musicSelection, setMusicSelection],
  );

  const handleMusicStartChange = useCallback(
    (startSec: number) => {
      if (!musicSelection) return;
      const clipLen = musicClipDurationSec;
      setMusicSelection({
        ...musicSelection,
        musicStartSec: startSec,
        musicEndSec:
          mediaType === 'video'
            ? Math.min(startSec + clipLen, musicSelection.durationSec)
            : photoPostMusicEndSec(startSec, musicSelection.durationSec),
      });
    },
    [mediaType, musicClipDurationSec, musicSelection, setMusicSelection],
  );

  const handleHeaderBack = useCallback(() => {
    if (musicEditing) {
      if (!musicConfirmed) {
        setMusicSelection(null);
      }
      setMusicEditing(false);
      return;
    }
    if (musicInfoOpen) {
      setMusicInfoOpen(false);
      return;
    }
    if (musicOpen) {
      setMusicOpen(false);
      return;
    }
    if (activeTool != null) {
      setActiveTool(null);
      return;
    }
    router.back();
  }, [
    activeTool,
    musicConfirmed,
    musicEditing,
    musicInfoOpen,
    musicOpen,
    setMusicSelection,
  ]);

  const previewTop = insets.top + headerHeight;
  const previewBottom = STORY_PUBLISH_BOTTOM_CHROME_HEIGHT + insets.bottom;

  const fallbackMetrics = useMemo((): StoryCardMetrics | null => {
    const stageWidth = Math.max(0, windowWidth - STORY_PUBLISH_HORIZONTAL_INSET * 2);
    const stageHeight = Math.max(0, windowHeight - previewTop - previewBottom);
    if (stageWidth <= 8 || stageHeight <= 8) return null;
    const card = fitStoryCardInStage(stageWidth, stageHeight);
    if (card.width <= 8 || card.height <= 8) return null;
    return {
      stageWidth,
      stageHeight,
      cardWidth: card.width,
      cardHeight: card.height,
    };
  }, [previewBottom, previewTop, windowHeight, windowWidth]);

  const effectiveMetrics = cardMetrics ?? fallbackMetrics;
  const canRenderStoryCard = Boolean(effectiveMetrics);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing) return;
    if (!publishUri && !mediaUri) return;
    if (mediaType === 'video' && stabilizing) return;
    if (mediaType === 'image' && (!imagePreviewReady || imagePreviewError || !canRenderStoryCard)) {
      Alert.alert('Görsel hazır değil', 'Fotoğraf yüklenene kadar kısa bir süre bekleyip tekrar deneyin.');
      return;
    }
    if (storyUploadBusy) {
      Alert.alert('Yükleniyor', 'Önceki hikâye yüklemesi bitene kadar bekleyin.');
      return;
    }

    setPublishing(true);
    setUploadMessage(mediaType === 'image' ? 'Görsel hazırlanıyor…' : null);

    let uploadUri = publishUri || mediaUri;
    let uploadFraming: StoryFraming | null = null;

    if (mediaType === 'image') {
      try {
        setHideChromeForCapture(true);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        uploadUri = await bakeStoryFramedImage(captureRef.current);
      } catch (err) {
        setPublishing(false);
        setUploadMessage(null);
        setHideChromeForCapture(false);
        Alert.alert(
          'Görsel hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
        return;
      } finally {
        setHideChromeForCapture(false);
      }
    } else if (mediaType === 'video') {
      const size = mediaSize ?? {
        width: mediaWidth ?? DEFAULT_STORY_FRAMING.mediaWidth,
        height: mediaHeight ?? DEFAULT_STORY_FRAMING.mediaHeight,
      };
      uploadFraming = {
        ...framing,
        mediaWidth: size.width,
        mediaHeight: size.height,
      };
    }

    startStoryPublish(
      {
        authorId: user.id,
        localUri: uploadUri,
        mediaType,
        durationSec: normalizedDurationSec,
        regionId: regionId ?? null,
        framing: uploadFraming,
        music: musicSelection,
        location: selectedLocation,
        locationPosition,
        links,
        trimmedInStudio,
        videoOriginalAudioVolume:
          mediaType === 'video'
            ? musicSelection
              ? musicSelection.originalAudioVolume
              : videoMuted
                ? 0
                : 1
            : undefined,
      },
      uploadUri,
    );

    useStoryPublishStore.getState().clearDraft();
    useMusicSelectionStore.getState().clearSelection();
    setPublishing(false);
    setUploadMessage(null);
    router.dismissTo('/(tabs)' as Href);
  }, [
    framing,
    normalizedDurationSec,
    mediaSize,
    mediaType,
    imagePreviewError,
    imagePreviewReady,
    canRenderStoryCard,
    musicSelection,
    publishUri,
    publishing,
    regionId,
    selectedLocation,
    locationPosition,
    links,
    stabilizing,
    startStoryPublish,
    storyUploadBusy,
    trimmedInStudio,
    user,
    videoMuted,
    mediaUri,
  ]);

  const displayUri = normalizeLocalFileUri(publishUri || mediaUri);
  const canShowMediaPreview = displayUri.length > 0;

  useEffect(() => {
    if (mediaType !== 'image') return;
    setImagePreviewReady(false);
    setImagePreviewError(false);
  }, [displayUri, mediaType]);

  useEffect(() => {
    if (mediaType !== 'image' || imagePreviewReady || imagePreviewError) return;
    const timer = setTimeout(() => {
      setImagePreviewReady(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [displayUri, imagePreviewError, imagePreviewReady, mediaType]);
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
    scopeActive: mediaType === 'image' && musicPlaysOnStory,
    playing: mediaType === 'image' && musicPlaysOnStory,
  });

  const handleLocationChange = useCallback((location: SelectedLocation | null) => {
    const hadLocation = selectedLocation != null;
    setSelectedLocation(location);
    if (location && !hadLocation) {
      setLocationPosition(DEFAULT_STORY_LOCATION_POSITION);
    }
  }, [selectedLocation]);

  const linkEditorEnabled = !publishing && !musicEditing;
  const locationEditorEnabled = linkEditorEnabled;
  const musicStackedWithLocation =
    Boolean(selectedLocation) && locationPosition.yNorm >= 0.72;

  // Link/konum sürüklerken medya pan/pinch ile çakışmasın.
  const mediaGesturesEnabled =
    !publishing && !musicEditing && activeTool !== 'location' && activeTool !== 'link';

  const handleFramingChange = useCallback((next: StoryFraming) => {
    setFraming(next);
  }, []);

  const publishMediaNode = useMemo(
    () => (
      <StoryPublishMedia
        uri={displayUri}
        mediaType={mediaType}
        music={musicSelection}
        musicPlaysOnStory={musicPlaysOnStory}
        videoMuted={videoOriginalMuted}
        onImageLoad={() => {
          setImagePreviewError(false);
          setImagePreviewReady(true);
        }}
        onImageError={() => {
          setImagePreviewReady(false);
          setImagePreviewError(true);
        }}
      />
    ),
    [
      displayUri,
      mediaType,
      musicPlaysOnStory,
      musicSelection,
      videoOriginalMuted,
    ],
  );

  const framedPublishMediaNode = useMemo(
    () => (
      <StoryFramingEditor
        framing={framing}
        onFramingChange={handleFramingChange}
        mediaWidth={framing.mediaWidth}
        mediaHeight={framing.mediaHeight}
        interactive={mediaGesturesEnabled}
        mediaGesturesEnabled={mediaGesturesEnabled}
      >
        {publishMediaNode}
      </StoryFramingEditor>
    ),
    [framing, handleFramingChange, mediaGesturesEnabled, publishMediaNode],
  );

  const handlePreviewStackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      onStageLayout(width, height);
    },
    [onStageLayout],
  );

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <View
        style={[styles.header, { paddingTop: insets.top }]}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) setHeaderHeight(height);
        }}
      >
        <Pressable onPress={handleHeaderBack} hitSlop={10} disabled={publishing}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          {musicEditing ? 'Müzik' : 'Hikaye paylaş'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View
        style={[
          styles.previewStage,
          {
            top: previewTop,
            bottom: previewBottom,
            marginHorizontal: STORY_PUBLISH_HORIZONTAL_INSET,
          },
        ]}
        pointerEvents={musicEditing ? 'none' : 'auto'}
      >
        {canShowMediaPreview ? (
          <View style={styles.previewStack} onLayout={handlePreviewStackLayout}>
            {canRenderStoryCard && effectiveMetrics ? (
            <StoryPublishCanvas
              captureRef={captureRef}
              metrics={effectiveMetrics}
              mediaNode={framedPublishMediaNode}
            >
            {!hideChromeForCapture ? (
              <>
            {musicSelection && musicConfirmed && !musicEditing ? (
              <StoryMusicBadge
                title={musicSelection.displayTitle}
                artist={musicSelection.artist}
                durationSec={Math.max(0, musicSelection.musicEndSec - musicSelection.musicStartSec) || musicSelection.durationSec}
                stacked={musicStackedWithLocation}
                onPress={() => setMusicInfoOpen(true)}
              />
            ) : null}

            {selectedLocation ? (
              <StoryLocationEditor
                location={selectedLocation}
                position={locationPosition}
                onPositionChange={setLocationPosition}
                onPress={() => setActiveTool('location')}
                enabled={locationEditorEnabled}
              />
            ) : null}

            {mediaType === 'video' && normalizedDurationSec && !musicEditing ? (
              <View style={styles.durationBadge}>
                <Ionicons name="videocam" size={12} color="#fff" />
                <Text variant="caption" style={styles.durationText}>
                  {Math.round(normalizedDurationSec)} sn
                </Text>
              </View>
            ) : null}

            {stabilizing ? (
              <View style={styles.stabilizeBadge}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : null}

            <StoryLinkEditor links={links} onLinksChange={setLinks} enabled={linkEditorEnabled} />
              </>
            ) : null}
            </StoryPublishCanvas>
            ) : (
              <View style={[styles.previewFallbackCard, effectiveMetrics ? { width: effectiveMetrics.cardWidth, height: effectiveMetrics.cardHeight } : null]}>
                {framedPublishMediaNode}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
            {imagePreviewError ? (
              <Text variant="caption" style={styles.previewLoadingText}>
                Fotoğraf açılamadı. Geri dönüp yeniden seçmeyi deneyin.
              </Text>
            ) : null}
            {mediaType === 'video' && stabilizing ? (
              <Text variant="caption" style={styles.previewLoadingText}>
                Video hazırlanıyor…
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {!musicEditing && activeTool !== 'location' && activeTool !== 'link' ? (
        <StoryPublishRail
          isVideo={mediaType === 'video'}
          activeTool={activeTool}
          hasMusic={Boolean(musicSelection) && musicConfirmed}
          hasLocation={Boolean(selectedLocation)}
          hasLinks={links.length > 0}
          videoAudioMuted={videoOriginalMuted}
          topOffset={previewTop + STORY_PUBLISH_RAIL_TOP_EXTRA}
          onPress={handleToolPress}
        />
      ) : null}

      <View
        style={[styles.bottomDock, { height: previewBottom, paddingBottom: insets.bottom }]}
        pointerEvents={musicEditing ? 'none' : 'auto'}
      >
        {musicEditing ? (
          <View style={styles.bottomChromeSpacer} />
        ) : (
          <>
            {uploadMessage ? (
              <Text variant="caption" style={styles.uploadHint}>
                {uploadMessage}
              </Text>
            ) : null}

            <Pressable
              style={[
                styles.publishBtn,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    publishing ||
                    !displayUri ||
                    stabilizing ||
                    musicEditing ||
                    (mediaType === 'image' && !imagePreviewReady)
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={() => void handlePublish()}
              disabled={
                publishing ||
                !displayUri ||
                stabilizing ||
                musicEditing ||
                (mediaType === 'image' && !imagePreviewReady)
              }
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
          </>
        )}
      </View>

      {musicSelection && musicEditing ? (
        <Pressable
          style={[styles.musicDismiss, { top: previewTop }]}
          onPress={() => {
            setMusicConfirmed(true);
            setMusicEditing(false);
          }}
        />
      ) : null}

      {musicSelection && musicEditing ? (
        <View style={styles.musicStripHost} pointerEvents="box-none">
          <StoryMusicStrip
            visible
            music={musicSelection}
            mediaType={mediaType}
            clipDurationSec={musicClipDurationSec}
            onStartChange={handleMusicStartChange}
            onRangeChange={handleMusicRangeChange}
            onChangeTrack={() => {
              setMusicOpen(true);
            }}
            onRemove={() => {
              setMusicSelection(null);
              setMusicConfirmed(false);
              setMusicEditing(false);
            }}
            onDone={() => {
              setMusicConfirmed(true);
              setMusicEditing(false);
            }}
          />
        </View>
      ) : null}

      <AudioPickerSheet
        visible={musicOpen}
        selectedTrackId={musicSelection?.trackId ?? null}
        selectionMode
        tapToSelect
        onClose={() => setMusicOpen(false)}
        onSelect={handleMusicSelect}
      />

      <StoryLocationSheet
        visible={activeTool === 'location'}
        regionId={resolveMarketplaceRegionId(regionId)}
        value={selectedLocation}
        onChange={handleLocationChange}
        onClose={() => setActiveTool(null)}
      />

      <StoryLinkSheet
        visible={activeTool === 'link'}
        links={links}
        onChange={setLinks}
        onClose={() => setActiveTool(null)}
      />

      {musicManifest && musicAddedBy ? (
        <StoryMusicInfoSheet
          visible={musicInfoOpen}
          music={musicManifest}
          addedBy={musicAddedBy}
          onClose={() => setMusicInfoOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, position: 'relative' },
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
  previewStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  musicDismiss: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 70,
    elevation: 70,
  },
  musicStripHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    elevation: 80,
  },
  previewStack: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackCard: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  bottomChrome: {
    minHeight: STORY_PUBLISH_BOTTOM_CHROME_HEIGHT,
    justifyContent: 'flex-end',
  },
  bottomChromeSpacer: {
    height: STORY_PUBLISH_BOTTOM_CHROME_HEIGHT,
  },
  previewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    gap: spacing.sm,
  },
  previewLoadingText: {
    color: 'rgba(255,255,255,0.7)',
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
});
