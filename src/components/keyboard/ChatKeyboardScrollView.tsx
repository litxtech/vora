import { forwardRef, useCallback } from 'react';
import { Keyboard, Platform, type ScrollViewProps } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import type { KeyboardChatScrollViewProps } from 'react-native-keyboard-controller';

type Ref = React.ElementRef<typeof KeyboardChatScrollView>;

export type ChatKeyboardScrollViewProps = ScrollViewProps &
  Pick<
    KeyboardChatScrollViewProps,
    | 'inverted'
    | 'offset'
    | 'extraContentPadding'
    | 'keyboardLiftBehavior'
    | 'applyWorkaroundForContentInsetHitTestBug'
    | 'blankSpace'
  > & {
    chatScrollRef?: React.RefObject<Ref | null>;
  };

/**
 * FlatList / FlashList için renderScrollComponent — sohbet ekranında klavye + input bar senkronu.
 */
export const ChatKeyboardScrollView = forwardRef<Ref, ChatKeyboardScrollViewProps>(
  (
    {
      inverted,
      offset,
      extraContentPadding,
      blankSpace,
      keyboardLiftBehavior = 'always',
      applyWorkaroundForContentInsetHitTestBug,
      chatScrollRef,
      onScrollBeginDrag,
      ...props
    },
    ref,
  ) => {
    const setRefs = useCallback(
      (instance: Ref | null) => {
        if (chatScrollRef) {
          chatScrollRef.current = instance;
        }
        if (typeof ref === 'function') {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
      },
      [chatScrollRef, ref],
    );

    const handleScrollBeginDrag = useCallback(
      (event: Parameters<NonNullable<ScrollViewProps['onScrollBeginDrag']>>[0]) => {
        Keyboard.dismiss();
        onScrollBeginDrag?.(event);
      },
      [onScrollBeginDrag],
    );

    return (
      <KeyboardChatScrollView
        ref={setRefs}
        inverted={inverted}
        offset={offset}
        extraContentPadding={extraContentPadding}
        blankSpace={blankSpace}
        keyboardLiftBehavior={keyboardLiftBehavior}
        applyWorkaroundForContentInsetHitTestBug={applyWorkaroundForContentInsetHitTestBug}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        {...props}
        onScrollBeginDrag={handleScrollBeginDrag}
      />
    );
  },
);

ChatKeyboardScrollView.displayName = 'ChatKeyboardScrollView';
