import { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMediaEditorDragStore } from '@/features/compose/store/mediaEditorDragStore';
import { radius, spacing } from '@/constants/theme';

type Props = {
  /** Alt kart açıkken çöp kutusunu panelin üstüne taşır */
  elevated?: boolean;
};

export function MediaEditorTrashZone({ elevated = false }: Props) {
  const insets = useSafeAreaInsets();
  const binRef = useRef<View>(null);
  const isDragging = useMediaEditorDragStore((s) => s.isDragging);
  const isOverTrash = useMediaEditorDragStore((s) => s.isOverTrash);
  const setTrashBounds = useMediaEditorDragStore((s) => s.setTrashBounds);
  const visible = useSharedValue(0);

  useEffect(() => {
    visible.value = withSpring(isDragging ? 1 : 0, { damping: 18, stiffness: 220 });
    if (!isDragging) {
      setTrashBounds(null);
      return;
    }

    const timer = setTimeout(() => {
      binRef.current?.measureInWindow((x, y, width, height) => {
        const pad = 12;
        setTrashBounds({
          left: x - pad,
          top: y - pad,
          right: x + width + pad,
          bottom: y + height + pad,
        });
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [isDragging, setTrashBounds, visible]);

  const hostStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: 0.82 + visible.value * 0.18 }],
  }));

  const bottom = elevated
    ? Dimensions.get('window').height * 0.5 + spacing.md
    : insets.bottom + spacing.lg;

  if (!isDragging) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.host, { bottom }, hostStyle]}
    >
      <View
        ref={binRef}
        style={[styles.bin, isOverTrash ? styles.binActive : null]}
      >
        <Ionicons name={isOverTrash ? 'trash' : 'trash-outline'} size={26} color="#fff" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  bin: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  binActive: {
    backgroundColor: 'rgba(255,59,48,0.92)',
    borderColor: 'rgba(255,255,255,0.7)',
    transform: [{ scale: 1.12 }],
  },
});
