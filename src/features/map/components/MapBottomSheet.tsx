import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SLIDE_MS = 280;
const DISMISS_DRAG = 64;

type MapBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Alt güvenli alan boşluğu */
  bottomInset: number;
  /** Kartı ekstra yukarı taşır (px) */
  bottomOffset?: number;
  /** Kartın ekrandaki üst sınırı (px) */
  maxHeight?: number;
  /** Kartın minimum yüksekliği (px) */
  minHeight?: number;
  children: ReactNode;
};

export function MapBottomSheet({
  visible,
  onClose,
  bottomInset,
  bottomOffset = 0,
  maxHeight,
  minHeight,
  children,
}: MapBottomSheetProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(360);

  const finishClose = () => setMounted(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
      return;
    }

    if (!mounted) return;

    translateY.value = withTiming(360, { duration: SLIDE_MS, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  }, [visible, mounted, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DRAG || event.velocityY > 850) {
        runOnJS(onClose)();
        return;
      }
      translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    });

  if (!mounted) return null;

  const cardTint = isDark ? 'rgba(18, 24, 32, 0.78)' : 'rgba(255, 255, 255, 0.9)';

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.float,
            sheetStyle,
            {
              marginBottom: bottomInset + bottomOffset,
              marginHorizontal: spacing.md,
              maxHeight: maxHeight ?? '72%',
              minHeight: minHeight,
            },
          ]}
          pointerEvents="auto"
        >
          <View
            style={[
              styles.card,
              {
                borderColor: surface.border,
                maxHeight: maxHeight ?? '100%',
                minHeight: minHeight,
              },
            ]}
          >
            {isDark && Platform.OS === 'ios' ? (
              <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View
              style={[
                styles.cardBody,
                {
                  backgroundColor: cardTint,
                  maxHeight: maxHeight ?? '100%',
                  minHeight: minHeight,
                },
              ]}
            >
              <View style={[styles.handle, { backgroundColor: surface.handle }]} />
              {children}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 45,
  },
  float: {
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  cardBody: {
    gap: spacing.xs,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
