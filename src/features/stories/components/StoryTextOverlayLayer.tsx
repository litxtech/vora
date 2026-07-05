import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';
import { STORY_TEXT_HIT_PADDING } from '@/features/stories/utils/storyTextOverlays';

type StoryTextOverlayLayerProps = {
  overlays: StudioTextOverlay[];
  selectedId: string | null;
  editable: boolean;
  onUpdate: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  dragDelete?: OverlayDragDeleteHandlers;
};

export function StoryTextOverlayLayer({
  overlays,
  selectedId,
  editable,
  onUpdate,
  onSelect,
  onDelete,
  dragDelete,
}: StoryTextOverlayLayerProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  if (overlays.length === 0) return null;

  const dragDeleteEnabled = editable && dragDelete && onDelete;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="box-none">
      {layout.width > 0
        ? overlays.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <DraggableTextOverlay
                key={item.id}
                overlay={item}
                containerWidth={layout.width}
                containerHeight={layout.height}
                editable={editable}
                visible
                selected={isSelected}
                chrome="minimal"
                hitPadding={STORY_TEXT_HIT_PADDING}
                gesturesWhenSelectedOnly
                pinchEnabled={isSelected}
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
