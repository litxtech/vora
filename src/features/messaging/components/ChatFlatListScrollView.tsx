import { forwardRef } from 'react';
import { Platform, type ScrollViewProps } from 'react-native';
import { ChatKeyboardScrollView } from '@/components/keyboard';
import { useChatKeyboardScrollContext } from '../context/ChatKeyboardScrollContext';

type Ref = React.ElementRef<typeof ChatKeyboardScrollView>;

/** FlatList renderScrollComponent — inverted sohbet listesi, klavye ile senkron kaydırma. */
export const ChatFlatListScrollView = forwardRef<Ref, ScrollViewProps>((props, ref) => {
  const { offset, extraContentPadding } = useChatKeyboardScrollContext();

  return (
    <ChatKeyboardScrollView
      {...props}
      ref={ref}
      inverted
      offset={offset}
      extraContentPadding={extraContentPadding}
      keyboardLiftBehavior="whenAtEnd"
      applyWorkaroundForContentInsetHitTestBug={Platform.OS === 'ios'}
    />
  );
});

ChatFlatListScrollView.displayName = 'ChatFlatListScrollView';
