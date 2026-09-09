import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const DISMISS_DRAG_PX = 72;
const DISMISS_VELOCITY = 850;

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Ekran yüksekliğinin oranı (klavye kapalıyken) */
  heightFraction?: number;
  /** Klavye açıkken sheet üst kenarının geçemeyeceği minimum Y (ör. paylaşım ekranı header'ı) */
  topInset?: number;
};

/**
 * Medya düzenleyicide alt yarım ekran kart — üstteki önizleme dokunulabilir kalır (metin/konum sürükleme).
 */
export function MediaEditorBottomSheet({
  visible,
  onClose,
  title,
  headerRight,
  children,
  heightFraction = 0.5,
  topInset: topInsetProp,
}: Props) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const insets = useSafeAreaInsets();
  const topInset = topInsetProp ?? insets.top + 52;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      translateY.value = 0;
      return;
    }

    translateY.value = 0;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, visible]);

  const sheetHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    const baseHeight = windowHeight * heightFraction;
    if (keyboardHeight <= 0) return baseHeight;

    const availableAboveKeyboard = windowHeight - keyboardHeight - topInset;
    return Math.max(200, Math.min(baseHeight, availableAboveKeyboard));
  }, [heightFraction, keyboardHeight, topInset]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dismissPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          if (event.translationY > 0) {
            translateY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          if (event.translationY > DISMISS_DRAG_PX || event.velocityY > DISMISS_VELOCITY) {
            runOnJS(onClose)();
            return;
          }
          translateY.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [onClose, translateY],
  );

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
      />
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            height: sheetHeight + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.surfaceElevated,
            bottom: keyboardHeight,
          },
        ]}
      >
        <GestureDetector gesture={dismissPan}>
          <View style={styles.dragHeader}>
            <Pressable onPress={onClose} style={styles.handleHit} hitSlop={12}>
              <View style={[styles.handle, { backgroundColor: surface.handle }]} />
            </Pressable>

            <View style={styles.header}>
              <Text variant="label" style={styles.title}>
                {title}
              </Text>
              {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
            </View>
          </View>
        </GestureDetector>

        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  dragHeader: {
    zIndex: 2,
  },
  handleHit: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    minHeight: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing.sm,
    zIndex: 3,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
