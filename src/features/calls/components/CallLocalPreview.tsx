import { useEffect } from 'react';
import { StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CallRtcView } from '@/features/calls/components/CallRtcView';
import { CALL_DESIGN } from '@/features/calls/constants';
import { buildLocalVideoCanvas } from '@/features/calls/services/callVideoCanvas';

const SPRING = { damping: 22, stiffness: 280 };

type CallLocalPreviewProps = {
  userId: string;
  visible: boolean;
  onFlipCamera: () => void;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Sürüklenebilir yerel video önizlemesi (PiP) + kamera çevirme. */
export function CallLocalPreview({ userId, visible, onFlipCamera }: CallLocalPreviewProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { width, height, radius } = CALL_DESIGN.localPreview;

  const maxX = Math.max(0, screenW - width - 16);
  const minY = insets.top + 64;
  const maxY = Math.max(minY, screenH - height - 200);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(minY);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    offsetX.value = maxX;
    offsetY.value = minY;
  }, [maxX, minY, offsetX, offsetY]);

  const pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const nextX = clamp(offsetX.value + event.translationX, 8, maxX);
      const nextY = clamp(offsetY.value + event.translationY, minY, maxY);
      offsetX.value = withSpring(nextX, SPRING);
      offsetY.value = withSpring(nextY, SPRING);
      dragX.value = 0;
      dragY.value = 0;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    left: offsetX.value + dragX.value,
    top: offsetY.value + dragY.value,
  }));

  if (!visible) return null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.shell,
          {
            width,
            height,
            borderRadius: radius,
          },
          animatedStyle,
        ]}
      >
        <CallRtcView
          style={styles.video}
          pip
          canvas={buildLocalVideoCanvas(userId)}
        />
        <View style={styles.borderGlow} pointerEvents="none" />
        <Pressable
          style={styles.flipBtn}
          onPress={onFlipCamera}
          hitSlop={8}
          accessibilityLabel="Kamerayı çevir"
        >
          <Ionicons name="camera-reverse" size={18} color="#fff" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    zIndex: 20,
    overflow: 'hidden',
    backgroundColor: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 12,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CALL_DESIGN.localPreview.radius,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  flipBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
