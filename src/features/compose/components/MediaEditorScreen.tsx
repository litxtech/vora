import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { MediaEditorFilterPanel } from '@/features/compose/components/MediaEditorFilterPanel';
import { MediaEditorLocationSheet } from '@/features/compose/components/MediaEditorLocationSheet';
import { MediaEditorOverlayBar } from '@/features/compose/components/MediaEditorOverlayBar';
import { MediaEditorPreview } from '@/features/compose/components/MediaEditorPreview';
import { MediaEditorRail, type MediaEditorToolId } from '@/features/compose/components/MediaEditorRail';
import { MediaEditorTextPanel } from '@/features/compose/components/MediaEditorTextPanel';
import { MediaEditorTrashZone } from '@/features/compose/components/MediaEditorTrashZone';
import type { MediaEditorFilterId } from '@/features/compose/constants/mediaEditor';
import { createOverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';
import { useMediaEditorDragStore } from '@/features/compose/store/mediaEditorDragStore';
import { useMediaEditorStore } from '@/features/compose/store/mediaEditorStore';
import { cropImageSquare, getImageSize, getOrientedImageSize, rotateImage } from '@/features/compose/services/mediaEditorImage';
import { DEFAULT_ZOOM } from '@/features/compose/utils/mediaEditorZoom';
import { saveUriToGallery } from '@/features/compose/services/saveMediaToGallery';
import { MusicPickerSheet } from '@/features/music/components/MusicPickerSheet';
import { MediaEditorMusicPanel } from '@/features/compose/components/MediaEditorMusicPanel';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicTrack } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type Params = {
  mediaUris?: string | string[];
  mediaType?: string | string[];
  mediaWidths?: string | string[];
  mediaHeights?: string | string[];
};

function parseCsvParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw.split(',').map((part) => part.trim());
}

function resolveIsVideo(uri: string, forcedType?: string): boolean {
  if (forcedType === 'video') return true;
  if (forcedType === 'image') return false;
  return isLocalVideoUri(uri);
}

function isEmojiOverlayText(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return /^[\p{Extended_Pictographic}\u200d\uFE0F]+$/u.test(value);
}

function buildManifest(
  textOverlays: PublishedEditManifest['textOverlays'],
  durationSec: number,
): PublishedEditManifest | null {
  if (textOverlays.length === 0) return null;
  return {
    version: 1,
    textOverlays,
    trimStartSec: 0,
    trimEndSec: durationSec,
  };
}

export function MediaEditorScreen() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const captureViewRef = useRef<View>(null);

  const slides = useMediaEditorStore((s) => s.slides);
  const currentIndex = useMediaEditorStore((s) => s.currentIndex);
  const selectedLocation = useMediaEditorStore((s) => s.selectedLocation);
  const locationPinX = useMediaEditorStore((s) => s.locationPinX);
  const locationPinY = useMediaEditorStore((s) => s.locationPinY);
  const activePanel = useMediaEditorStore((s) => s.activePanel);
  const selectedTextOverlayId = useMediaEditorStore((s) => s.selectedTextOverlayId);
  const initSlides = useMediaEditorStore((s) => s.initSlides);
  const reset = useMediaEditorStore((s) => s.reset);
  const setCurrentIndex = useMediaEditorStore((s) => s.setCurrentIndex);
  const setActivePanel = useMediaEditorStore((s) => s.setActivePanel);
  const setSelectedLocation = useMediaEditorStore((s) => s.setSelectedLocation);
  const setLocationPin = useMediaEditorStore((s) => s.setLocationPin);
  const setSelectedTextOverlayId = useMediaEditorStore((s) => s.setSelectedTextOverlayId);
  const updateTextOverlay = useMediaEditorStore((s) => s.updateTextOverlay);
  const addTextOverlay = useMediaEditorStore((s) => s.addTextOverlay);
  const removeTextOverlay = useMediaEditorStore((s) => s.removeTextOverlay);
  const rotateSlide = useMediaEditorStore((s) => s.rotateSlide);
  const setSlideFilter = useMediaEditorStore((s) => s.setSlideFilter);
  const setSlideZoom = useMediaEditorStore((s) => s.setSlideZoom);
  const updateSlide = useMediaEditorStore((s) => s.updateSlide);
  const videoMuted = useMediaEditorStore((s) => s.videoMuted);
  const setVideoMuted = useMediaEditorStore((s) => s.setVideoMuted);

  const musicSelection = useMusicSelectionStore((s) => s.selection);
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);
  const setEditManifest = useStudioExportStore((s) => s.setEditManifest);
  const isDraggingOverlay = useMediaEditorDragStore((s) => s.isDragging);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicPreviewPlaying, setMusicPreviewPlaying] = useState(false);
  const [locationPinSelected, setLocationPinSelected] = useState(false);

  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const slide = slides[currentIndex] ?? null;
  const isVideo = slide?.isVideo ?? false;
  const hasMultiple = slides.length > 1;

  const editManifest = useMemo(
    () => (slide ? buildManifest(slide.textOverlays, slide.durationSec) : null),
    [slide],
  );

  const activeTool: MediaEditorToolId | null =
    activePanel === 'text'
      ? 'text'
      : activePanel === 'filter'
        ? 'filter'
        : activePanel === 'location' || locationOpen
          ? 'location'
          : activePanel === 'music' || musicOpen
            ? 'music'
            : null;

  useEffect(() => {
    void (async () => {
      if (!(await requireAuth('Paylaşım'))) {
        router.back();
      }
    })();
  }, [requireAuth]);

  useEffect(() => {
    const rawUris = Array.isArray(params.mediaUris) ? params.mediaUris[0] : params.mediaUris;
    const forcedType = Array.isArray(params.mediaType) ? params.mediaType[0] : params.mediaType;
    const uris = (rawUris ?? '').split(',').filter(Boolean);
    const widths = parseCsvParam(params.mediaWidths);
    const heights = parseCsvParam(params.mediaHeights);
    if (!uris.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextSlides = await Promise.all(
        uris.map(async (uri, index) => {
          const video = resolveIsVideo(uri, forcedType);
          const durationSec = video ? await probeVideoDuration(uri) : 0;
          let mediaWidth = Number(widths[index] ?? 0);
          let mediaHeight = Number(heights[index] ?? 0);
          if (!video) {
            try {
              if (mediaWidth <= 0 || mediaHeight <= 0) {
                const size = await getOrientedImageSize(uri);
                mediaWidth = size.width;
                mediaHeight = size.height;
              }
            } catch {
              mediaWidth = 1080;
              mediaHeight = 1920;
            }
          }
          return {
            uri,
            isVideo: video,
            durationSec,
            textOverlays: [],
            filterId: 'none' as MediaEditorFilterId,
            rotationDeg: 0 as const,
            mediaWidth,
            mediaHeight,
            zoomScale: DEFAULT_ZOOM.zoomScale,
            zoomTranslateX: DEFAULT_ZOOM.zoomTranslateX,
            zoomTranslateY: DEFAULT_ZOOM.zoomTranslateY,
          };
        }),
      );

      if (cancelled) return;
      initSlides(nextSlides);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [params.mediaUris, params.mediaType, params.mediaWidths, params.mediaHeights, initSlides]);

  const handleBack = () => {
    reset();
    useMediaEditorDragStore.getState().reset();
    useMusicSelectionStore.getState().clearSelection();
    useStudioExportStore.getState().clearExport();
    router.back();
  };

  const handleTool = async (tool: MediaEditorToolId) => {
    if (tool === 'text') {
      setLocationOpen(false);
      setMusicOpen(false);
      setActivePanel('text');
      return;
    }
    if (tool === 'location') {
      setMusicOpen(false);
      setActivePanel('location');
      setLocationOpen(true);
      setLocationPinSelected(true);
      return;
    }
    if (tool === 'filter') {
      setLocationOpen(false);
      setMusicOpen(false);
      setActivePanel(activePanel === 'filter' ? 'none' : 'filter');
      return;
    }
    if (tool === 'rotate' && slide && !slide.isVideo) {
      rotateSlide(currentIndex);
      return;
    }
    if (tool === 'crop' && slide && !slide.isVideo) {
      try {
        setBusy(true);
        const cropped = await cropImageSquare(slide.uri);
        updateSlide(currentIndex, { uri: cropped, rotationDeg: 0 });
      } catch {
        // Kırpma başarısız — orijinal kalır.
      } finally {
        setBusy(false);
      }
      return;
    }
    if (tool === 'music') {
      setLocationOpen(false);
      if (musicSelection && !slide?.isVideo) {
        setMusicOpen(false);
        setActivePanel('music');
        return;
      }
      setActivePanel('music');
      setMusicOpen(true);
      return;
    }
    if (tool === 'audio') {
      const nextMuted = !videoMuted;
      setVideoMuted(nextMuted);
      if (musicSelection) {
        setMusicSelection({
          ...musicSelection,
          originalAudioVolume: nextMuted ? 0 : 0.15,
        });
      }
      return;
    }
    if (tool === 'trim' && slide?.isVideo) {
      router.push({
        pathname: '/vora-studio',
        params: { sourceUri: slide.uri, mode: 'post' },
      } as Href);
      return;
    }
    if (tool === 'download') {
      if (!slide) return;
      setBusy(true);
      try {
        const uri = slide.isVideo ? slide.uri : await captureSlideUri(currentIndex);
        const result = await saveUriToGallery(uri, slide.isVideo ? 'video' : 'photo');
        if (result.ok) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Kaydedildi', slide.isVideo ? 'Video galeriye indirildi.' : 'Fotoğraf galeriye indirildi.');
        } else {
          Alert.alert('İndirilemedi', result.error ?? 'Galeriye kaydedilemedi.');
        }
      } finally {
        setBusy(false);
      }
    }
  };

  const captureSlideUri = async (index: number): Promise<string> => {
    const target = slides[index];
    if (!target) return '';
    if (target.isVideo) return target.uri;

    if (target.rotationDeg) {
      const rotated = await rotateImage(target.uri, target.rotationDeg);
      updateSlide(index, { uri: rotated, rotationDeg: 0 });
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (index !== currentIndex) {
      setCurrentIndex(index);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (!captureViewRef.current) {
      return useMediaEditorStore.getState().slides[index]?.uri ?? target.uri;
    }

    try {
      return await captureRef(captureViewRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
      });
    } catch {
      return useMediaEditorStore.getState().slides[index]?.uri ?? target.uri;
    }
  };

  const handleContinue = async () => {
    if (!slides.length) return;

    setBusy(true);
    try {
      const finalUris: string[] = [];
      for (let i = 0; i < slides.length; i += 1) {
        finalUris.push(await captureSlideUri(i));
      }

      const videoSlide = slides.find((item) => item.isVideo);
      if (videoSlide) {
        const manifest = buildManifest(videoSlide.textOverlays, videoSlide.durationSec);
        setEditManifest(manifest);
      } else if (slides.some((item) => item.textOverlays.length > 0)) {
        const photoSlide = slides.find((item) => item.textOverlays.length > 0) ?? slides[0];
        setEditManifest(buildManifest(photoSlide.textOverlays, photoSlide.durationSec || 999));
      } else {
        setEditManifest(null);
      }

      router.replace({
        pathname: '/compose',
        params: {
          mediaUris: finalUris.join(','),
          fromEditor: '1',
        },
      } as Href);
    } finally {
      setBusy(false);
    }
  };

  const handleMusicSelect = useCallback(
    (track: MusicTrack) => {
      const videoDuration = slide?.durationSec ?? track.durationSec;
      const muted = useMediaEditorStore.getState().videoMuted;
      setMusicSelection({
        trackId: track.id,
        displayTitle: track.displayTitle,
        artist: track.artist,
        audioUrl: track.audioUrl,
        durationSec: track.durationSec,
        musicStartSec: 0,
        musicEndSec: slide?.isVideo
          ? Math.min(track.durationSec, videoDuration || track.durationSec)
          : photoPostMusicEndSec(0, track.durationSec),
        musicVolume: 0.85,
        originalAudioVolume: slide?.isVideo ? (muted ? 0 : 0.15) : 0,
      });
      setMusicOpen(false);
      setActivePanel('music');
      setMusicPreviewPlaying(!slide?.isVideo);
    },
    [setMusicSelection, setActivePanel, slide?.durationSec, slide?.isVideo],
  );

  const handleZoomChange = useCallback(
    (zoom: Parameters<typeof setSlideZoom>[1]) => {
      setSlideZoom(currentIndex, zoom);
    },
    [currentIndex, setSlideZoom],
  );

  const overlayDragDelete = useMemo(() => createOverlayDragDeleteHandlers(), []);

  const handleDeleteTextOverlay = useCallback(
    (id: string) => {
      removeTextOverlay(currentIndex, id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (activePanel === 'text' && slide?.textOverlays.length <= 1) {
        setActivePanel('none');
      }
    },
    [activePanel, currentIndex, removeTextOverlay, setActivePanel, slide?.textOverlays.length],
  );

  const handleDeleteLocation = useCallback(() => {
    setSelectedLocation(null);
    setLocationPinSelected(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [setSelectedLocation]);

  const overlayHandlers = useMemo(
    () => ({
      onUpdate: (id: string, patch: Parameters<typeof updateTextOverlay>[2]) => {
        updateTextOverlay(currentIndex, id, patch);
      },
      onSelect: (id: string) => {
        setSelectedTextOverlayId(id);
        setActivePanel('text');
      },
    }),
    [currentIndex, updateTextOverlay, setSelectedTextOverlayId, setActivePanel],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!slide) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Medya bulunamadı.</Text>
        <Pressable onPress={handleBack}>
          <Text style={styles.errorLink}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const textEditing = activePanel === 'text';
  const selectedOverlay =
    slide?.textOverlays.find((item) => item.id === selectedTextOverlayId) ?? null;
  const showOverlayBar =
    !!selectedOverlay &&
    activePanel === 'none' &&
    !textEditing &&
    !locationOpen &&
    !musicOpen &&
    !isDraggingOverlay;

  const effectiveMusic = musicSelection
    ? {
        ...musicSelection,
        originalAudioVolume: slide?.isVideo
          ? videoMuted
            ? 0
            : musicSelection.originalAudioVolume
          : 0,
      }
    : null;

  return (
    <View style={styles.root}>
      <MediaEditorPreview
        slide={slide}
        slideIndex={currentIndex}
        location={selectedLocation}
        locationPinX={locationPinX}
        locationPinY={locationPinY}
        locationPinSelected={locationPinSelected}
        textEditing={textEditing}
        selectedTextId={selectedTextOverlayId}
        music={effectiveMusic}
        videoMuted={videoMuted}
        editManifest={editManifest}
        captureRef={captureViewRef}
        zoomEnabled={activePanel !== 'text'}
        locationPinEditable={!!selectedLocation}
        onUpdateOverlay={overlayHandlers.onUpdate}
        onSelectOverlay={overlayHandlers.onSelect}
        onLocationPinMove={(x, y) => setLocationPin(x, y)}
        onLocationPinSelect={() => setLocationPinSelected(true)}
        onZoomChange={handleZoomChange}
        overlaysEditable
        overlayDragDelete={overlayDragDelete}
        onDeleteTextOverlay={handleDeleteTextOverlay}
        onDeleteLocation={handleDeleteLocation}
        musicPreviewPlaying={musicPreviewPlaying}
      />

      <MediaEditorTrashZone elevated={textEditing || locationOpen} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable onPress={handleBack} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>

        {hasMultiple ? (
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{slides.length}
            </Text>
          </View>
        ) : (
          <View style={styles.topSpacer} />
        )}

        <Pressable
          onPress={() => void handleContinue()}
          disabled={busy}
          hitSlop={12}
          style={[styles.nextBtn, busy && styles.nextBtnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextText}>İleri</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      {hasMultiple ? (
        <View
          style={[
            styles.carouselNav,
            {
              bottom:
                insets.bottom +
                (textEditing ? 0 : activePanel === 'filter' ? 108 : 28),
            },
          ]}
        >
          <Pressable
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex(currentIndex - 1)}
            style={[styles.carouselBtn, currentIndex === 0 && styles.carouselBtnDisabled]}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Pressable
            disabled={currentIndex >= slides.length - 1}
            onPress={() => setCurrentIndex(currentIndex + 1)}
            style={[styles.carouselBtn, currentIndex >= slides.length - 1 && styles.carouselBtnDisabled]}
          >
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <MediaEditorOverlayBar
        visible={showOverlayBar}
        isEmoji={selectedOverlay ? isEmojiOverlayText(selectedOverlay.text) : false}
        onEdit={() => setActivePanel('text')}
        onDelete={() => {
          if (!selectedOverlay) return;
          removeTextOverlay(currentIndex, selectedOverlay.id);
        }}
        onDismiss={() => setSelectedTextOverlayId(null)}
      />

      <MediaEditorRail
        visible={!locationOpen && !textEditing && !isDraggingOverlay}
        isVideo={isVideo}
        activeTool={activeTool}
        hasLocation={!!selectedLocation}
        hasMusic={!!musicSelection}
        hasFilter={slide.filterId !== 'none'}
        audioMuted={videoMuted}
        onPress={(tool) => void handleTool(tool)}
      />

      <MediaEditorTextPanel
        slideIndex={currentIndex}
        durationSec={slide.durationSec}
        visible={textEditing}
        onClose={() => setActivePanel('none')}
      />

      <MediaEditorFilterPanel
        visible={activePanel === 'filter'}
        selectedId={slide.filterId}
        onSelect={(filterId) => setSlideFilter(currentIndex, filterId)}
      />

      <MediaEditorLocationSheet
        visible={locationOpen}
        regionId={regionId}
        value={selectedLocation}
        onChange={(loc) => {
          setSelectedLocation(loc);
          if (loc) setLocationPinSelected(true);
        }}
        onClose={() => {
          setLocationOpen(false);
          setActivePanel('none');
        }}
      />

      <MusicPickerSheet
        visible={musicOpen}
        selectedTrackId={musicSelection?.trackId ?? null}
        onClose={() => {
          setMusicOpen(false);
          if (!musicSelection) setActivePanel('none');
        }}
        onSelect={handleMusicSelect}
      />

      {musicSelection && !slide.isVideo ? (
        <MediaEditorMusicPanel
          visible={activePanel === 'music' && !musicOpen}
          music={musicSelection}
          previewPlaying={musicPreviewPlaying}
          onTogglePreview={() => setMusicPreviewPlaying((v) => !v)}
          onChangeTrack={() => setMusicOpen(true)}
          onRemove={() => {
            setMusicSelection(null);
            setMusicPreviewPlaying(false);
            setActivePanel('none');
          }}
          onUpdate={(patch) => {
            if (musicSelection) setMusicSelection({ ...musicSelection, ...patch });
          }}
          onClose={() => {
            setMusicPreviewPlaying(false);
            setActivePanel('none');
          }}
        />
      ) : null}

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.busyText}>Hazırlanıyor…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: '#fff',
  },
  errorLink: {
    color: '#7eb8ff',
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 5,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    flex: 1,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  counterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 84,
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  carouselNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 3,
  },
  carouselBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselBtnDisabled: {
    opacity: 0.35,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 10,
  },
  busyText: {
    color: '#fff',
    fontWeight: '600',
  },
});
