import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';
import { STORY_TEXT_HIT_PADDING, STORY_TEXT_PINCH_PADDING } from '@/features/stories/utils/storyTextOverlays';

type StoryTextOverlayLayerProps = {
  overlays: StudioTextOverlay[];
  selectedId: string | null;
  editable: boolean;
  textEditing?: boolean;
  containerWidth?: number;
  containerHeight?: number;
  onUpdate: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  dragDelete?: OverlayDragDeleteHandlers;
  onTextTransformActiveChange?: (active: boolean) => void;
};

export function StoryTextOverlayLayer({
  overlays,
  selectedId,
  editable,
  textEditing = false,
  containerWidth,
  containerHeight,
  onUpdate,
  onSelect,
  onDelete,
  dragDelete,
  onTextTransformActiveChange,
}: StoryTextOverlayLayerProps) {
  const [localLayout, setLocalLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLocalLayout({ width, height });
    }
  }, []);

  if (overlays.length === 0) return null;

  const layoutWidth = Math.max(containerWidth ?? 0, localLayout.width);
  const layoutHeight = Math.max(containerHeight ?? 0, localLayout.height);
  const dragDeleteEnabled = editable && dragDelete && onDelete;
  const pinchPadding = textEditing ? 0 : STORY_TEXT_PINCH_PADDING;

  return (
    <View style={styles.layer} onLayout={onLayout} pointerEvents="box-none" collapsable={false}>
      {layoutWidth > 0 && layoutHeight > 0
        ? overlays.map((item) => {
            const isSelected = selectedId === item.id;
            const hasText = Boolean(item.text.trim());
            if (!hasText && !(textEditing && isSelected)) return null;
            return (
              <DraggableTextOverlay
                key={item.id}
                overlay={item}
                containerWidth={layoutWidth}
                containerHeight={layoutHeight}
                editable={editable}
                visible
                selected={isSelected}
                chrome="minimal"
                hitPadding={textEditing ? 0 : STORY_TEXT_HIT_PADDING}
                pinchHitPadding={pinchPadding}
                gesturesWhenSelectedOnly
                pinchEnabled={!textEditing && isSelected}
                showSelectionHint={textEditing && isSelected}
                onTransformActiveChange={onTextTransformActiveChange}
                dragDelete={
                  dragDeleteEnabled && isSelected
                    ? {
                        ...dragDelete,
                        onDelete: () => onDelete(item.id),
                      }
                    : undefined
                }
                onUpdate={onUpdate}
                onSelect={onSelect}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    ...Platform.select({
      android: { elevation: 50 },
    }),
  },
});
