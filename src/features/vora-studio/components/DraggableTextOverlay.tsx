import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { clampTime } from '@/features/vora-studio/utils/time';

type DraggableTextOverlayProps = {
  overlay: StudioTextOverlay;
  containerWidth: number;
  containerHeight: number;
  editable: boolean;
  visible: boolean;
  selected: boolean;
  /** studio: seçim çerçevesi; minimal: yalnızca metin (Instagram tarzı) */
  chrome?: 'studio' | 'minimal';
  dragDelete?: {
    onDragStart: () => void;
    onDragMove: (absoluteX: number, absoluteY: number) => void;
    onDragEnd: () => void;
    shouldDeleteOnDrop: (absoluteX: number, absoluteY: number) => boolean;
    onDelete: () => void;
  };
  onUpdate?: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelect?: (id: string) => void;
};

const MIN_FONT = 14;
const MAX_FONT = 44;

export function DraggableTextOverlay({
  overlay,
  containerWidth,
  containerHeight,
  editable,
  visible,
  selected,
  chrome = 'studio',
  dragDelete,
  onUpdate,
  onSelect,
}: DraggableTextOverlayProps) {
  const showChrome = chrome === 'studio';
  const studioUpdate = useStudioEditorStore((s) => s.updateTextOverlay);
  const studioSelect = useStudioEditorStore((s) => s.setSelectedTextOverlay);
  const updateTextOverlay = onUpdate ?? ((id, patch) => studioUpdate(id, patch));
  const setSelectedTextOverlay = onSelect ?? studioSelect;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const commitPosition = (dx: number, dy: number) => {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    const nextX = clampTime(overlay.x + dx / containerWidth, 0, 0.92);
    const nextY = clampTime(overlay.y + dy / containerHeight, 0, 0.92);
    updateTextOverlay(overlay.id, { x: nextX, y: nextY });
  };

  const commitFontSize = (delta: number) => {
    const next = Math.round(clampTime(overlay.fontSize + delta * 0.15, MIN_FONT, MAX_FONT));
    updateTextOverlay(overlay.id, { fontSize: next });
  };

  const finishPan = (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
    if (dragDelete?.shouldDeleteOnDrop(absoluteX, absoluteY)) {
      dragDelete.onDelete();
    } else {
      commitPosition(translationX, translationY);
    }
    dragDelete?.onDragEnd();
  };

  const panGesture = Gesture.Pan()
    .enabled(editable)
    .minDistance(8)
    .onStart(() => {
      if (dragDelete) runOnJS(dragDelete.onDragStart)();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      if (dragDelete) runOnJS(dragDelete.onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(finishPan)(e.translationX, e.translationY, e.absoluteX, e.absoluteY);
      translateX.value = 0;
      translateY.value = 0;
    });

  const resizeGesture = Gesture.Pan()
    .enabled(editable && selected)
    .onUpdate(() => {})
    .onEnd((e) => {
      runOnJS(commitFontSize)(e.translationX + e.translationY);
    });

  const tapGesture = Gesture.Tap()
    .enabled(editable)
    .onEnd(() => {
      runOnJS(setSelectedTextOverlay)(overlay.id);
    });

  const composed = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.wrap,
          {
            left: overlay.x * containerWidth,
            top: overlay.y * containerHeight,
          },
          animatedStyle,
          showChrome && selected && editable ? styles.selected : null,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: overlay.fontSize,
              lineHeight: Math.round(overlay.fontSize * 1.28),
              color: overlay.color,
              fontWeight: overlay.fontFamily === 'bold' ? '800' : '600',
              opacity: overlay.text ? 1 : 0.65,
            },
          ]}
          includeFontPadding={false}
        >
          {overlay.text || (selected && editable ? 'Metin yaz…' : '')}
        </Text>

        {showChrome && selected && editable ? (
          <GestureDetector gesture={resizeGesture}>
            <View style={styles.resizeHandle}>
              <Ionicons name="resize-outline" size={12} color="#fff" />
            </View>
          </GestureDetector>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    maxWidth: '88%',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: 'rgba(30,136,229,0.9)',
    borderStyle: 'dashed',
  },
  text: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  resizeHandle: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(30,136,229,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
