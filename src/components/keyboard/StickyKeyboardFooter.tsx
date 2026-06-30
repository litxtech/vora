import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StickyKeyboardFooterProps = {
  children: ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
  useSafeArea?: boolean;
  onLayoutHeight?: (height: number) => void;
};

/**
 * Input bar klavyenin hemen üstüne yapışır.
 * Alt safe-area padding sabit; klavye açıkken pozitif offset ile home-indicator boşluğu telafi edilir.
 */
export function StickyKeyboardFooter({
  children,
  backgroundColor,
  style,
  useSafeArea = true,
  onLayoutHeight,
}: StickyKeyboardFooterProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeArea ? insets.bottom : 0;

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
      <View
        onLayout={(event) => onLayoutHeight?.(event.nativeEvent.layout.height)}
        style={[
          styles.footer,
          {
            backgroundColor,
            paddingBottom: bottomInset,
          },
          style,
        ]}
      >
        {children}
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
  },
});
