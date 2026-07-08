import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
  type View as RNView,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MediaEditorLocationSheet } from '@/features/compose/components/MediaEditorLocationSheet';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { AudioPickerSheet } from '@/features/sounds/components/AudioPickerSheet';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicSelection } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { musicSelectionToManifest } from '@/features/stories/utils/storyManifest';
import { PHOTO_POST_MUSIC_DURATION_SEC } from '@/features/music/constants';
import { StoryPublishCanvas } from '@/features/stories/components/StoryPublishCanvas';
import { useStoryPublishText } from '@/features/stories/hooks/useStoryPublishText';
import { StoryLinkEditor } from '@/features/stories/components/StoryLinkEditor';
import { StoryLinkSheet } from '@/features/stories/components/StoryLinkSheet';
import { StoryMusicBadge } from '@/features/stories/components/StoryMusicBadge';
import { StoryMusicInfoSheet } from '@/features/stories/components/StoryMusicInfoSheet';
import { StoryMusicTrimCard } from '@/features/stories/components/StoryMusicTrimCard';
import {
  StoryPublishRail,
  type StoryPublishToolId,
} from '@/features/stories/components/StoryPublishRail';
import { MediaEditorTrashZone } from '@/features/compose/components/MediaEditorTrashZone';
import {
  createOverlayDragDeleteHandlers,
} from '@/features/compose/store/mediaEditorDragStore';
import { StoryTextPanel } from '@/features/stories/components/StoryTextPanel';
import { serializeStoryTextOverlays } from '@/features/stories/utils/storyTextOverlays';
import { bakeStoryFramedImage } from '@/features/stories/services/bakeStoryFramedImage';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { routeStoryVideo, normalizeIncomingDurationSec } from '@/features/stories/services/routeStoryVideo';
import { useStoryUploadStore } from '@/features/stories/store/storyUploadStore';
import { documentDirectory } from 'expo-file-system/legacy';
import { getLocalFileSize, normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { prepareLocalImageUri } from '@/lib/media/prepareLocalImage';
import { stabilizeStoryVideoUri } from '@/features/stories/services/stabilizeStoryMedia';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
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
import { STORY_CARD_HORIZONTAL_INSET } from '@/features/stories/constants';
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
  const [publishUri, setPublishUri] = useState(mediaUri);
  const [stabilizing, setStabilizing] = useState(false);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(() =>
    resolveInitialMediaSize(mediaWidth, mediaHeight),
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
  const [musicInfoOpen, setMusicInfoOpen] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [links, setLinks] = useState<StoryLinkManifest[]>([]);
  const [textTransformActive, setTextTransformActive] = useState(false);
  const [hideOverlaysForCapture, setHideOverlaysForCapture] = useState(false);

  const {
    textOverlays,
    textEditing,
    selectedTextId,
    activeOverlay,
    hasText,
    setTextEditing,
    setSelectedTextId,
    updateOverlay: updateTextOverlay,
    startEditing: startTextEditing,
    finishEditing: finishTextEditing,
    addOverlay: addTextOverlay,
    removeOverlay: removeTextOverlay,
    selectOverlay: handleSelectTextOverlay,
    commitForPublish,
    closeEditing: closeTextEditing,
  } = useStoryPublishText();

  const storyVideoClipSec =
    normalizedDurationSec != null && normalizedDurationSec > 0
      ? normalizedDurationSec
      : (musicSelection?.durationSec ?? 15);

  const musicClipDurationSec =
    mediaType === 'video'
      ? storyVideoClipSec
      : Math.min(PHOTO_POST_MUSIC_DURATION_SEC, musicSelection?.durationSec ?? PHOTO_POST_MUSIC_DURATION_SEC);

  const musicPlaysOnStory = Boolean(musicSelection) && !musicOpen;

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
      const fallback = resolveInitialMediaSize(mediaWidth, mediaHeight) ?? {
        width: 1080,
        height: 1920,
      };

      try {
        const size =
          mediaType === 'image'
            ? await probeImageSize(publishUri)
            : await probeVideoSize(publishUri);
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
      } catch {
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
    const alreadyStable =
      Boolean(documentDirectory) &&
      normalized.includes(documentDirectory!) &&
      getLocalFileSize(normalized) > 0;

    if (alreadyStable) {
      setPublishUri(normalized);
      return;
    }

    let cancelled = false;

    void prepareLocalImageUri(mediaUri)
      .then((stable) => {
        if (cancelled) return;
        setPublishUri(stable);
        useStoryPublishStore.getState().setDraft({
          mediaUri: stable,
          mediaType: 'image',
          durationSec: normalizedDurationSec,
          mediaWidth,
          mediaHeight,
          trimmedInStudio,
        });
      })
      .catch(() => {
        /* Galeri URI'si olduğu gibi kullanılır */
      });

    return () => {
      cancelled = true;
    };
  }, [mediaHeight, mediaType, mediaUri, mediaWidth, normalizedDurationSec, trimmedInStudio]);

  useEffect(() => {
    if (mediaType !== 'video') return;

    const normalized = normalizeLocalFileUri(mediaUri);
    const alreadyStable =
      Boolean(documentDirectory) &&
      normalized.includes(documentDirectory!) &&
      getLocalFileSize(normalized) > 0;

    if (alreadyStable) {
      setPublishUri(normalized);
      return;
    }

    let cancelled = false;
    setStabilizing(true);

    void stabilizeStoryVideoUri(mediaUri)
      .then((stable) => {
        if (cancelled) return;
        if (stable !== mediaUri) {
          setPublishUri(stable);
          useStoryPublishStore.getState().setDraft({
            mediaUri: stable,
            mediaType: 'video',
            durationSec: normalizedDurationSec,
            trimmedInStudio,
          });
        }
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

  const closeOtherTools = useCallback(() => {
    setMusicOpen(false);
    setMusicEditing(false);
    setActiveTool(null);
    closeTextEditing();
  }, [closeTextEditing]);

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

  const overlayDragDelete = useMemo(() => createOverlayDragDeleteHandlers(), []);

  const handleDeleteTextOverlay = useCallback(
    (id: string) => {
      removeTextOverlay(id);
    },
    [removeTextOverlay],
  );

  const handleToolPress = useCallback(
    (tool: StoryPublishToolId) => {
      if (tool === 'text') {
        setMusicOpen(false);
        setMusicEditing(false);
        if (activeTool === 'text' && textEditing) {
          finishTextEditing();
          return;
        }
        setActiveTool('text');
        if (textOverlays.length === 0) {
          startTextEditing();
          return;
        }
        setTextEditing(true);
        if (!selectedTextId && textOverlays.length > 0) {
          setSelectedTextId(textOverlays[textOverlays.length - 1].id);
        }
        return;
      }

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
      if (textEditing) {
        finishTextEditing();
      } else {
        setTextEditing(false);
        setSelectedTextId(null);
      }

      if (tool === 'link') {
        setActiveTool(activeTool === 'link' ? null : 'link');
        return;
      }

      if (tool === 'location') {
        setActiveTool(activeTool === 'location' ? null : 'location');
      }
    },
    [activeTool, closeOtherTools, finishTextEditing, handleToggleVideoAudio, musicSelection, selectedTextId, setTextEditing, setSelectedTextId, startTextEditing, textEditing, textOverlays.length],
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
    if (textEditing) {
      finishTextEditing();
      return;
    }
    if (selectedTextId) {
      setSelectedTextId(null);
      return;
    }
    if (musicEditing) {
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
  }, [activeTool, finishTextEditing, musicEditing, musicInfoOpen, musicOpen, selectedTextId, textEditing]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || publishing) return;
    if (!publishUri && !mediaUri) return;
    if (mediaType === 'video' && (!mediaSize || stabilizing)) return;
    if (storyUploadBusy) {
      Alert.alert('Yükleniyor', 'Önceki hikâye yüklemesi bitene kadar bekleyin.');
      return;
    }

    const publishedTextOverlays =
      textEditing || textOverlays.some((item) => item.text.trim())
        ? commitForPublish()
        : (serializeStoryTextOverlays(textOverlays) ?? []);

    setPublishing(true);
    setUploadMessage(mediaType === 'image' ? 'Görsel hazırlanıyor…' : null);

    let uploadUri = publishUri || mediaUri;
    let uploadFraming: StoryFraming | null = null;

    if (mediaType === 'image') {
      try {
        setHideOverlaysForCapture(true);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        uploadUri = await bakeStoryFramedImage(captureRef.current);
      } catch (err) {
        setPublishing(false);
        setUploadMessage(null);
        setHideOverlaysForCapture(false);
        Alert.alert(
          'Görsel hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
        return;
      } finally {
        setHideOverlaysForCapture(false);
      }
    } else if (mediaSize) {
      uploadFraming = {
        ...framing,
        mediaWidth: mediaSize.width,
        mediaHeight: mediaSize.height,
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
        links,
        textOverlays: publishedTextOverlays,
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
    commitForPublish,
    textEditing,
    stabilizing,
    startStoryPublish,
    storyUploadBusy,
    trimmedInStudio,
    user,
    videoMuted,
    mediaUri,
  ]);

  const displayUri = publishUri || mediaUri;
  const canShowMediaPreview = Boolean(displayUri);
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

  const framingGesturesEnabled =
    !publishing && !textTransformActive && !musicEditing && !textEditing;
  const linkEditorEnabled = !publishing && !musicEditing && !textEditing;
  const overlayEditable = !publishing && !musicEditing;
  const showTextLayer =
    !hideOverlaysForCapture &&
    (textEditing || textOverlays.some((item) => item.text.trim()));

  const previewFraming = useMemo(
    (): StoryFraming => ({
      ...framing,
      mediaWidth: mediaSize?.width ?? mediaWidth ?? DEFAULT_STORY_FRAMING.mediaWidth,
      mediaHeight: mediaSize?.height ?? mediaHeight ?? DEFAULT_STORY_FRAMING.mediaHeight,
    }),
    [framing, mediaHeight, mediaSize, mediaWidth],
  );

  return (
    <View style={[styles.root, { backgroundColor: '#000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleHeaderBack} hitSlop={10} disabled={publishing}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          {musicEditing ? 'Müzik' : textEditing ? 'Metin' : 'Hikaye paylaş'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.previewStage}>
        {canShowMediaPreview ? (
          <StoryPublishCanvas
            captureRef={captureRef}
            displayUri={displayUri}
            mediaType={mediaType}
            framing={previewFraming}
            onFramingChange={handleFramingChange}
            framingGesturesEnabled={framingGesturesEnabled}
            music={musicSelection}
            musicPlaysOnStory={musicPlaysOnStory}
            videoMuted={videoOriginalMuted}
            textOverlays={textOverlays}
            textEditing={textEditing}
            plainMediaPreview={textEditing || musicEditing}
            selectedTextId={selectedTextId}
            overlaysEditable={overlayEditable}
            showTextLayer={showTextLayer}
            onUpdateText={updateTextOverlay}
            onSelectText={handleSelectTextOverlay}
            onDeleteText={handleDeleteTextOverlay}
            dragDelete={overlayDragDelete}
            onTextTransformActiveChange={setTextTransformActive}
          >
            {musicSelection && !musicEditing ? (
              <StoryMusicBadge
                title={musicSelection.displayTitle}
                artist={musicSelection.artist}
                stacked={Boolean(selectedLocation)}
                onPress={() => setMusicInfoOpen(true)}
              />
            ) : null}

            {selectedLocation ? (
              <View style={styles.locationPreview}>
                <Ionicons name="location" size={13} color="#fff" />
                <Text variant="caption" style={styles.locationPreviewText} numberOfLines={1}>
                  {selectedLocation.label}
                </Text>
              </View>
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

            {musicSelection && musicEditing ? (
              <StoryMusicTrimCard
                music={musicSelection}
                mediaType={mediaType}
                clipDurationSec={musicClipDurationSec}
                onStartChange={handleMusicStartChange}
                onRangeChange={handleMusicRangeChange}
                onChangeTrack={() => {
                  setMusicEditing(false);
                  setMusicOpen(true);
                }}
                onRemove={() => {
                  setMusicSelection(null);
                  setMusicEditing(false);
                }}
                onDone={() => setMusicEditing(false)}
              />
            ) : null}
          </StoryPublishCanvas>
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
      </View>

      {!musicEditing && !textEditing && activeTool !== 'location' && activeTool !== 'link' ? (
        <StoryPublishRail
          isVideo={mediaType === 'video'}
          activeTool={activeTool}
          hasMusic={Boolean(musicSelection)}
          hasLocation={Boolean(selectedLocation)}
          hasLinks={links.length > 0}
          hasText={hasText}
          videoAudioMuted={videoOriginalMuted}
          onPress={handleToolPress}
        />
      ) : null}

      <MediaEditorTrashZone elevated={textEditing || musicEditing} />

      <StoryTextPanel
        visible={textEditing}
        overlay={activeOverlay}
        onUpdate={updateTextOverlay}
        onDone={() => finishTextEditing()}
        onAdd={addTextOverlay}
      />

      {!textEditing ? (
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
                opacity: publishing || !displayUri || stabilizing || musicEditing ? 0.5 : 1,
              },
            ]}
            onPress={() => void handlePublish()}
            disabled={publishing || !displayUri || stabilizing || musicEditing}
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
      ) : null}

      <AudioPickerSheet
        visible={musicOpen}
        selectedTrackId={musicSelection?.trackId ?? null}
        selectionMode
        tapToSelect
        onClose={() => setMusicOpen(false)}
        onSelect={handleMusicSelect}
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
  previewStage: {
    flex: 1,
    marginHorizontal: STORY_CARD_HORIZONTAL_INSET,
    marginBottom: spacing.sm,
  },
  previewStack: {
    flex: 1,
    position: 'relative',
  },
  previewWrap: {
    flex: 1,
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
});
