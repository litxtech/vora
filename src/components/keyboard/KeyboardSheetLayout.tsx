import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import type { SharedValue } from 'react-native-reanimated';
import { StickyKeyboardFooter } from './StickyKeyboardFooter';

type KeyboardSheetLayoutProps = {
  children: ReactNode;
  footer: ReactNode;
  backgroundColor: string;
  /** Sticky footer yüksekliği + safe area — scroll offset için */
  footerOffset?: number;
  extraContentPadding?: SharedValue<number>;
};

/**
 * Alt sheet modalları: yorumlar, alıntı, reel yorumu vb.
 * Liste klavye ile birlikte kayar, input klavyeye yapışık kalır.
 */
export function KeyboardSheetLayout({
  children,
  footer,
  backgroundColor,
  footerOffset = 72,
  extraContentPadding,
}: KeyboardSheetLayoutProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <KeyboardChatScrollView
        style={styles.scroll}
        offset={footerOffset}
        extraContentPadding={extraContentPadding}
        keyboardLiftBehavior="whenAtEnd"
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardChatScrollView>
      <StickyKeyboardFooter backgroundColor={backgroundColor}>{footer}</StickyKeyboardFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: '100%',
  },
  scroll: {
    flex: 1,
  },
});
