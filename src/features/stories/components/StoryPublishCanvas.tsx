import { useCallback, useState, type ReactNode, type RefObject } from 'react';
import { LayoutChangeEvent, StyleSheet, View, type View as RNView } from 'react-native';
import { StoryFramedMediaView } from '@/features/stories/components/StoryFramedMediaView';
import { StoryFramingEditor } from '@/features/stories/components/StoryFramingEditor';
import { StoryPublishMedia } from '@/features/stories/components/StoryPublishMedia';
import { StoryCanvasTextOverlays } from '@/features/stories/components/StoryCanvasTextOverlays';
import { storyCardFrameStyle } from '@/features/stories/utils/storyCardChrome';
import type { StoryFraming } from '@/features/stories/utils/storyFraming';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import type { MusicSelection } from '@/features/music/types';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';

type StoryPublishCanvasProps = {
  captureRef: RefObject<RNView | null>;
  displayUri: string;
  mediaType: 'image' | 'video';
  framing: StoryFraming;
  onFramingChange: (framing: StoryFraming) => void;
  framingGesturesEnabled: boolean;
  music?: MusicSelection | null;
  musicPlaysOnStory?: boolean;
  videoMuted?: boolean;
  textOverlays: StudioTextOverlay[];
  textEditing: boolean;
  plainMediaPreview?: boolean;
  selectedTextId: string | null;
  overlaysEditable: boolean;
  showTextLayer: boolean;
  onUpdateText: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelectText: (id: string) => void;
  onDeleteText?: (id: string) => void;
  dragDelete?: OverlayDragDeleteHandlers;
  onTextTransformActiveChange?: (active: boolean) => void;
  children?: ReactNode;
};

/**
 * Medya katmanı metin/müzik modunda ASLA transform'a girmez (iOS siyah ekran bug'ı).
 * Zoom/pan yalnızca normal modda StoryFramedMediaView ile.
 */
export function StoryPublishCanvas({
  captureRef,
  displayUri,
  mediaType,
  framing,
  onFramingChange,
  framingGesturesEnabled,
  music = null,
  musicPlaysOnStory = false,
  videoMuted = false,
  textOverlays,
  textEditing,
  plainMediaPreview = false,
  selectedTextId,
  overlaysEditable,
  showTextLayer,
  onUpdateText,
  onSelectText,
  onDeleteText,
  dragDelete,
  onTextTransformActiveChange,
  children,
}: StoryPublishCanvasProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const canMeasure = layout.width > 0 && layout.height > 0;
  const usePlainCover = plainMediaPreview || textEditing;

  return (
    <View style={styles.stage} onLayout={onLayout}>
      <View
        ref={captureRef}
        collapsable={false}
        style={[storyCardFrameStyle.frame, styles.capture]}
      >
        <View style={styles.mediaClip}>
          {usePlainCover ? (
            <StoryPublishMedia
              uri={displayUri}
              mediaType={mediaType}
              music={music}
              musicPlaysOnStory={musicPlaysOnStory}
              videoMuted={videoMuted}
            />
          ) : (
            <StoryFramedMediaView framing={framing}>
              <StoryPublishMedia
                uri={displayUri}
                mediaType={mediaType}
                music={music}
                musicPlaysOnStory={musicPlaysOnStory}
                videoMuted={videoMuted}
              />
            </StoryFramedMediaView>
          )}

          {framingGesturesEnabled ? (
            <View style={styles.gestureLayer} pointerEvents="box-none">
              <StoryFramingEditor
                framing={framing}
                onFramingChange={onFramingChange}
                mediaWidth={framing.mediaWidth}
                mediaHeight={framing.mediaHeight}
                enabled
                overlayOnly
              >
                <View style={styles.gestureHit} />
              </StoryFramingEditor>
            </View>
          ) : null}
        </View>

        {children}

        {showTextLayer && canMeasure ? (
          <View pointerEvents="box-none" style={styles.textLayer} collapsable={false}>
            <StoryCanvasTextOverlays
              overlays={textOverlays}
              layoutWidth={layout.width}
              layoutHeight={layout.height}
              selectedId={selectedTextId}
              editable={overlaysEditable}
              textEditing={textEditing}
              showPlaceholder={textEditing}
              onUpdate={onUpdateText}
              onSelect={onSelectText}
              onDelete={onDeleteText}
              dragDelete={dragDelete}
              onTextTransformActiveChange={onTextTransformActiveChange}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  capture: {
    flex: 1,
  },
  mediaClip: {
    flex: 1,
    overflow: 'hidden',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gestureHit: {
    flex: 1,
  },
  textLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
});
