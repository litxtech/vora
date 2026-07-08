import { useCallback, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';
import {
  clampStoryTextPosition,
  STORY_TEXT_BOUNDS,
  STORY_TEXT_HIT_PADDING,
  STORY_TEXT_PINCH_PADDING,
} from '@/features/stories/utils/storyTextOverlays';

type StoryCanvasTextOverlaysProps = {
  overlays: StudioTextOverlay[];
  layoutWidth: number;
  layoutHeight: number;
  selectedId: string | null;
  editable: boolean;
  textEditing?: boolean;
  showPlaceholder?: boolean;
  onUpdate: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  dragDelete?: OverlayDragDeleteHandlers;
  onTextTransformActiveChange?: (active: boolean) => void;
};

function PercentStoryText({
  item,
  isPlaceholder,
}: {
  item: StudioTextOverlay;
  isPlaceholder?: boolean;
}) {
  const label = item.text.trim() || 'Metin yaz…';
  const textColor = item.color === '#000000' ? '#FFFFFF' : item.color || '#FFFFFF';
  const x = Math.min(Math.max(item.x, STORY_TEXT_BOUNDS.minX), STORY_TEXT_BOUNDS.maxX);
  const y = Math.min(Math.max(item.y, STORY_TEXT_BOUNDS.minY), STORY_TEXT_BOUNDS.maxY);

  return (
    <View
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        maxWidth: '88%',
      }}
      pointerEvents="none"
      collapsable={false}
    >
      <RNText
        style={{
          fontSize: item.fontSize,
          lineHeight: Math.round(item.fontSize * 1.28),
          color: textColor,
          fontWeight: item.fontFamily === 'bold' ? '800' : '600',
          textAlign: 'center',
          opacity: isPlaceholder ? 0.75 : 1,
        }}
      >
        {label}
      </RNText>
    </View>
  );
}

/** Hikâye kartı içinde metin — sabit boyutlu alan, yüzde konumlandırma. */
export function StoryCanvasTextOverlays({
  overlays,
  layoutWidth,
  layoutHeight,
  selectedId,
  editable,
  textEditing = false,
  showPlaceholder = false,
  onUpdate,
  onSelect,
  onDelete,
  dragDelete,
  onTextTransformActiveChange,
}: StoryCanvasTextOverlaysProps) {
  const clampPosition = useCallback(
    (x: number, y: number) => clampStoryTextPosition(x, y, 'topLeft'),
    [],
  );

  const visible = useMemo(
    () => overlays.filter((item) => item.text.trim() || showPlaceholder),
    [overlays, showPlaceholder],
  );

  const canMeasure = layoutWidth > 0 && layoutHeight > 0;

  if (visible.length === 0 || !canMeasure) {
    return null;
  }

  return (
    <View style={styles.layer} pointerEvents="box-none" collapsable={false}>
      {visible.map((item) => {
        const isSelected = selectedId === item.id || (textEditing && visible.length === 1);
        const isPlaceholder = !item.text.trim();

        if (textEditing) {
          return (
            <PercentStoryText
              key={item.id}
              item={item}
              isPlaceholder={isPlaceholder}
            />
          );
        }

        if (!editable) {
          return (
            <PercentStoryText
              key={item.id}
              item={item}
              isPlaceholder={isPlaceholder}
            />
          );
        }

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
            hitPadding={STORY_TEXT_HIT_PADDING}
            pinchHitPadding={STORY_TEXT_PINCH_PADDING}
            gesturesWhenSelectedOnly
            pinchEnabled={isSelected}
            clampPosition={clampPosition}
            onTransformActiveChange={onTextTransformActiveChange}
            dragDelete={
              dragDelete && onDelete && isSelected
                ? { ...dragDelete, onDelete: () => onDelete(item.id) }
                : undefined
            }
            onUpdate={onUpdate}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    width: '100%',
    height: '100%',
    zIndex: 200,
    ...Platform.select({ android: { elevation: 200 } }),
  },
});
