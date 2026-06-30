import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { OverlayDragDeleteHandlers } from '@/features/compose/store/mediaEditorDragStore';
import { radius, spacing } from '@/constants/theme';

type Props = {
  label: string;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  editable: boolean;
  selected: boolean;
  dragDelete?: OverlayDragDeleteHandlers & { onDelete: () => void };
  onMove: (x: number, y: number) => void;
  onSelect: () => void;
};

export function DraggableLocationPin({
  label,
  x,
  y,
  containerWidth,
  containerHeight,
  editable,
  selected,
  dragDelete,
  onMove,
  onSelect,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const commit = (dx: number, dy: number) => {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    const nextX = Math.min(0.92, Math.max(0, x + dx / containerWidth));
    const nextY = Math.min(0.92, Math.max(0, y + dy / containerHeight));
    onMove(nextX, nextY);
  };

  const finishPan = (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
    if (dragDelete?.shouldDeleteOnDrop(absoluteX, absoluteY)) {
      dragDelete.onDelete();
    } else {
      commit(translationX, translationY);
    }
    dragDelete?.onDragEnd();
  };

  const pan = Gesture.Pan()
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

  const tap = Gesture.Tap()
    .enabled(editable)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (containerWidth <= 0 || containerHeight <= 0) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.pin,
          {
            left: x * containerWidth,
            top: y * containerHeight,
          },
          animatedStyle,
          selected && editable ? styles.pinSelected : null,
        ]}
      >
        <Ionicons name="location-sharp" size={14} color="#fff" />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '78%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  pinSelected: {
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: 0.1,
  },
});
