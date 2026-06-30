import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { MediaEditorLocalImage } from '@/features/compose/components/MediaEditorLocalImage';
import { DraggableLocationPin } from '@/features/compose/components/DraggableLocationPin';
import { MediaEditorZoomableLayer } from '@/features/compose/components/MediaEditorZoomableLayer';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import type { MusicSelection } from '@/features/music/types';
import type { MediaEditorSlide } from '@/features/compose/store/mediaEditorStore';
import type { MediaEditorZoomState } from '@/features/compose/utils/mediaEditorZoom';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { MEDIA_EDITOR_FILTERS } from '@/features/compose/constants/mediaEditor';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';

type Props = {
  slide: MediaEditorSlide;
  slideIndex: number;
  location: SelectedLocation | null;
  locationPinX: number | null;
  locationPinY: number | null;
  locationPinSelected: boolean;
  textEditing: boolean;
  selectedTextId: string | null;
  music: MusicSelection | null;
  videoMuted: boolean;
  editManifest: PublishedEditManifest | null;
  captureRef?: React.RefObject<View | null>;
  zoomEnabled?: boolean;
  locationPinEditable?: boolean;
  onZoomChange: (zoom: MediaEditorZoomState) => void;
  onUpdateOverlay: (id: string, patch: Partial<import('@/features/vora-studio/types').StudioTextOverlay>) => void;
  onSelectOverlay: (id: string) => void;
  onLocationPinMove: (x: number, y: number) => void;
  onLocationPinSelect: () => void;
  overlayDragDelete?: OverlayDragDeleteHandlers;
  onDeleteTextOverlay?: (id: string) => void;
  onDeleteLocation?: () => void;
  overlayAlwaysVisible?: boolean;
  overlaysEditable?: boolean;
  musicPreviewPlaying?: boolean;
};

function EditorVideoLayer({
  uri,
  music,
  videoMuted,
  onPlayhead,
}: {
  uri: string;
  music: MusicSelection | null;
  videoMuted: boolean;
  onPlayhead: (sec: number) => void;
}) {
  return (
    <CapturedVideoPreview
      uri={uri}
      music={music}
      videoMuted={videoMuted}
      onPlayhead={onPlayhead}
    />
  );
}

function EditorPhotoMusicLayer({ music, playing }: { music: MusicSelection; playing: boolean }) {
  useStandaloneMusicPlayer({
    config: {
      audioUrl: music.audioUrl,
      musicStartSec: music.musicStartSec,
      musicEndSec: music.musicEndSec,
      musicVolume: music.musicVolume,
      originalAudioVolume: 0,
    },
    scopeActive: true,
    playing,
  });
  return null;
}

function FilterOverlay({ filterId }: { filterId: MediaEditorSlide['filterId'] }) {
  const filter = MEDIA_EDITOR_FILTERS.find((item) => item.id === filterId);
  if (!filter?.overlay && !filter?.overlay2) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {filter.overlay ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.overlay }]} />
      ) : null}
      {filter.overlay2 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.overlay2, top: '38%' }]} />
      ) : null}
    </View>
  );
}

export function MediaEditorPreview({
  slide,
  slideIndex: _slideIndex,
  location,
  locationPinX,
  locationPinY,
  locationPinSelected,
  textEditing,
  selectedTextId,
  music,
  videoMuted,
  editManifest,
  captureRef,
  zoomEnabled = true,
  locationPinEditable = true,
  onZoomChange,
  onUpdateOverlay,
  onSelectOverlay,
  onLocationPinMove,
  onLocationPinSelect,
  overlayDragDelete,
  onDeleteTextOverlay,
  onDeleteLocation,
  overlayAlwaysVisible = true,
  overlaysEditable = true,
  musicPreviewPlaying = false,
}: Props) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        canvas: {
          flex: 1,
          backgroundColor: '#000',
        },
        captureLayer: {
          flex: 1,
          backgroundColor: '#000',
        },
        mediaClip: {
          flex: 1,
          overflow: 'hidden',
        },
      }),
    [],
  );

  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playheadSec, setPlayheadSec] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  };

  const showPhotoOverlays = overlayAlwaysVisible || textEditing || !slide.isVideo;
  const canZoom = zoomEnabled && !textEditing;
  const videoOverlays = editManifest?.textOverlays ?? slide.textOverlays;
  const zoom: MediaEditorZoomState = {
    zoomScale: slide.zoomScale,
    zoomTranslateX: slide.zoomTranslateX,
    zoomTranslateY: slide.zoomTranslateY,
  };

  const handleZoomChange = useCallback(
    (next: MediaEditorZoomState) => {
      onZoomChange(next);
    },
    [onZoomChange],
  );

  const dragDeleteEnabled = overlaysEditable && overlayDragDelete && onDeleteTextOverlay;

  return (
    <View style={styles.canvas} onLayout={onLayout}>
      <View ref={captureRef} collapsable={false} style={styles.captureLayer}>
        <View style={styles.mediaClip}>
          {slide.isVideo ? (
            <>
              <EditorVideoLayer
                uri={slide.uri}
                music={music}
                videoMuted={videoMuted}
                onPlayhead={setPlayheadSec}
              />
              <FilterOverlay filterId={slide.filterId} />
            </>
          ) : (
            <MediaEditorZoomableLayer
              enabled={canZoom}
              containerWidth={layout.width}
              containerHeight={layout.height}
              mediaWidth={slide.mediaWidth}
              mediaHeight={slide.mediaHeight}
              zoom={zoom}
              onZoomChange={handleZoomChange}
            >
              <MediaEditorLocalImage uri={slide.uri} rotationDeg={slide.rotationDeg} />
              <FilterOverlay filterId={slide.filterId} />
              {music ? <EditorPhotoMusicLayer music={music} playing={musicPreviewPlaying} /> : null}
            </MediaEditorZoomableLayer>
          )}
        </View>

        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {layout.width > 0
            ? (slide.isVideo ? videoOverlays : showPhotoOverlays ? slide.textOverlays : []).map((item) => {
              const inTime =
                slide.isVideo
                  ? overlayAlwaysVisible ||
                    textEditing ||
                    (playheadSec >= item.startSec && playheadSec <= item.endSec)
                  : true;
              return (
                <DraggableTextOverlay
                  key={item.id}
                  overlay={item}
                  containerWidth={layout.width}
                  containerHeight={layout.height}
                  editable={overlaysEditable}
                  visible={inTime}
                  selected={selectedTextId === item.id}
                  chrome="minimal"
                  dragDelete={
                    dragDeleteEnabled
                      ? {
                          ...overlayDragDelete,
                          onDelete: () => onDeleteTextOverlay(item.id),
                        }
                      : undefined
                  }
                  onUpdate={onUpdateOverlay}
                  onSelect={onSelectOverlay}
                />
              );
            })
            : null}

          {location && locationPinX != null && locationPinY != null && layout.width > 0 ? (
            <DraggableLocationPin
              label={location.label}
              x={locationPinX}
              y={locationPinY}
              containerWidth={layout.width}
              containerHeight={layout.height}
              editable={locationPinEditable}
              selected={locationPinSelected}
              dragDelete={
                overlaysEditable && overlayDragDelete && onDeleteLocation
                  ? { ...overlayDragDelete, onDelete: onDeleteLocation }
                  : undefined
              }
              onMove={onLocationPinMove}
              onSelect={onLocationPinSelect}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
