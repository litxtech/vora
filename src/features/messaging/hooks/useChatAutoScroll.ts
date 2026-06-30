import { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { FlatList } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_NEAR_BOTTOM_THRESHOLD } from '../constants';
import { useChatKeyboardHeight } from './useChatKeyboardHeight';

/** Inverted listede yeni mesaj / klavye: alttaysa takip et. */
export function useChatAutoScroll<T extends { id: string }>(
  items: T[],
  listRef: React.RefObject<FlatList<T> | null>,
  inverted = true,
) {
  const pinnedToBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useChatKeyboardHeight();
  const keyboardHeightRef = useRef(0);
  keyboardHeightRef.current = keyboardHeight;

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    if (inverted) {
      // iOS'ta klavye açıkken inverted liste, son balonu input/klavyenin üstünde tutmak için
      // contentInset.top (≈ klavye - alt safe-area) kadar NEGATİF offset'te "en altta" durur.
      // offset:0'a kaydırmak son balonu klavyenin arkasına iter. Android contentInsetTop'u
      // kullanıp scroll'u 0'da tuttuğundan orada 0 doğru hedeftir.
      const bottomOffset =
        Platform.OS === 'ios' && keyboardHeightRef.current > 0
          ? -Math.max(keyboardHeightRef.current - insets.bottom, 0)
          : 0;
      list.scrollToOffset({ offset: bottomOffset, animated: false });
      return;
    }
    list.scrollToEnd({ animated: false });
  }, [listRef, inverted, insets.bottom]);

  const pinToBottom = useCallback(() => {
    pinnedToBottomRef.current = true;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      if (inverted) {
        pinnedToBottomRef.current = contentOffset.y <= CHAT_NEAR_BOTTOM_THRESHOLD;
        return;
      }
      const maxOffset = Math.max(contentSize.height - layoutMeasurement.height, 0);
      const distanceFromBottom = maxOffset - contentOffset.y;
      pinnedToBottomRef.current =
        distanceFromBottom <= CHAT_NEAR_BOTTOM_THRESHOLD || maxOffset <= 0;
    },
    [inverted],
  );

  useLayoutEffect(() => {
    if (items.length === 0) {
      prevCountRef.current = 0;
      return;
    }

    const grew = items.length > prevCountRef.current;
    prevCountRef.current = items.length;

    if (grew && pinnedToBottomRef.current) {
      scrollToBottom();
    }
  }, [items.length, scrollToBottom]);

  return {
    scrollToBottom,
    pinToBottom,
    handleScroll,
    pinnedToBottomRef,
  };
}
