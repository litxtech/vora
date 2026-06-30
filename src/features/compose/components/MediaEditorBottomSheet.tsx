import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Ekran yüksekliğinin oranı (klavye kapalıyken) */
  heightFraction?: number;
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
}: Props) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

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
  }, [visible]);

  const sheetHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    const baseHeight = windowHeight * heightFraction;
    if (keyboardHeight <= 0) return baseHeight;
    const aboveKeyboard = windowHeight - keyboardHeight - insets.top - spacing.sm;
    return Math.max(200, Math.min(baseHeight, aboveKeyboard));
  }, [heightFraction, insets.top, keyboardHeight]);

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View
        style={[
          styles.sheet,
          {
            height: sheetHeight + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.surfaceElevated,
            bottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0,
          },
        ]}
        pointerEvents="auto"
      >
        <Pressable onPress={onClose} style={styles.handleHit} hitSlop={12}>
          <View style={[styles.handle, { backgroundColor: surface.handle }]} />
        </Pressable>

        <View style={styles.header}>
          <Text variant="label" style={styles.title}>
            {title}
          </Text>
          {headerRight}
        </View>

        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  sheet: {
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
    minHeight: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
