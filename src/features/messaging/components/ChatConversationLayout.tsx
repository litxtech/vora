import type { ReactNode, RefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type FlatListProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StickyKeyboardFooter } from '@/components/keyboard';
import { CHAT_BUBBLE_ABOVE_INPUT, CHAT_COMPOSER_MIN_HEIGHT } from '../constants';
import { ChatKeyboardScrollProvider } from '../context/ChatKeyboardScrollContext';
import { ChatFlatListScrollView } from './ChatFlatListScrollView';

type ChatConversationLayoutProps<T> = {
  listRef: RefObject<FlatList<T> | null>;
  data: T[];
  renderItem: FlatListProps<T>['renderItem'];
  keyExtractor: FlatListProps<T>['keyExtractor'];
  footer: ReactNode;
  footerBackgroundColor?: string;
  footerSolidColor?: string;
  onFooterLayout?: (height: number) => void;
  background?: ReactNode;
  listProps?: Omit<
    FlatListProps<T>,
    | 'ref'
    | 'data'
    | 'renderItem'
    | 'keyExtractor'
    | 'contentContainerStyle'
    | 'inverted'
    | 'style'
    | 'renderScrollComponent'
  >;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Inverted FlatList + absolute sticky footer.
 * Klavye kaydırması KeyboardChatScrollView ile senkron; yalnızca alttayken kalkar.
 */
export function ChatConversationLayout<T>({
  listRef,
  data,
  renderItem,
  keyExtractor,
  footer,
  footerBackgroundColor,
  footerSolidColor,
  onFooterLayout,
  background,
  listProps,
  contentContainerStyle,
}: ChatConversationLayoutProps<T>) {
  const insets = useSafeAreaInsets();
  // Tek satır input için ilk paint tahmini; gerçek yükseklik ölçülünce güncellenir.
  const fallbackFooter = CHAT_COMPOSER_MIN_HEIGHT + insets.bottom + 16;
  const [footerBase, setFooterBase] = useState(fallbackFooter);
  const minFooterRef = useRef(Number.POSITIVE_INFINITY);
  // Yalnızca input büyüdüğünde (çok satır / yanıt önizleme) eklenen ekstra boşluk.
  const extraContentPadding = useSharedValue(0);

  const handleFooterLayout = useCallback(
    (height: number) => {
      if (height > 0 && height < minFooterRef.current) {
        minFooterRef.current = height;
        setFooterBase(height);
      }
      const base = Number.isFinite(minFooterRef.current) ? minFooterRef.current : height;
      // Temel (tek satır) yükseklik içerik padding'inden gelir; sadece fazlası inset'e biner.
      extraContentPadding.value = Math.max(0, height - base);
      onFooterLayout?.(height);
    },
    [extraContentPadding, onFooterLayout],
  );

  // `offset` = ScrollView altı ile ekran altı arasındaki sabit boşluk (yalnızca safe-area).
  // İçerik klavye açılınca `keyboardHeight - offset` kadar yükselir; böylece son balon,
  // klavye üstünde duran input'un üstünde kalır (kapalı durumla aynı CHAT_BUBBLE_ABOVE_INPUT boşluğu).
  const keyboardScrollValue = useMemo(
    () => ({ offset: insets.bottom, extraContentPadding }),
    [insets.bottom, extraContentPadding],
  );

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => <ChatFlatListScrollView {...props} />,
    [],
  );

  const footerBg =
    Platform.OS === 'ios'
      ? (footerSolidColor ?? footerBackgroundColor)
      : footerBackgroundColor;

  const listContentStyle = [
    styles.messagesContent,
    contentContainerStyle,
    {
      // Ters liste: paddingTop görsel olarak en altta (input ile son balon arası) durur.
      // Tek satır input yüksekliği + nefes boşluğu burada; böylece ilk açılışta da balon
      // input'un altında kalmaz (contentInset'in başlangıç kaydırma sorununa takılmaz).
      paddingTop: footerBase + CHAT_BUBBLE_ABOVE_INPUT,
    },
  ];

  return (
    <ChatKeyboardScrollProvider value={keyboardScrollValue}>
      <View style={styles.root}>
        {background}
        <FlatList
          ref={listRef}
          data={data}
          inverted
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderScrollComponent={renderScrollComponent}
          style={styles.list}
          contentContainerStyle={listContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          {...listProps}
        />
        <View style={styles.footerHost} pointerEvents="box-none">
          <StickyKeyboardFooter
            backgroundColor={footerBg}
            onLayoutHeight={handleFooterLayout}
          >
            {footer}
          </StickyKeyboardFooter>
        </View>
      </View>
    </ChatKeyboardScrollProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
  },
  footerHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
