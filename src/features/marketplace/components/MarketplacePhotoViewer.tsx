import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
};

export function MarketplacePhotoViewer({
  visible,
  photos,
  initialIndex = 0,
  onClose,
  onIndexChange,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);

  const edgeTapHeight = insets.top + 56;
  const bottomTapHeight = insets.bottom + 72;

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [visible, initialIndex]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(next);
      onIndexChange?.(next);
    },
    [width, onIndexChange],
  );

  if (!photos.length) return null;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          bounces={photos.length > 1}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onScrollEnd}
          onScrollToIndexFailed={(info) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({ offset: info.index * width, animated: false });
            });
          }}
          renderItem={({ item }) => (
            <View style={[styles.page, { width, height }]}>
              <Pressable
                style={[styles.edgeTap, { height: edgeTapHeight }]}
                onPress={onClose}
                accessibilityLabel="Kapat"
              />
              <View style={styles.imageArea} pointerEvents="box-none">
                <Pressable style={styles.sideTap} onPress={onClose} accessibilityLabel="Kapat" />
                <View style={styles.imageFrame}>
                  <Image
                    source={{ uri: item }}
                    style={styles.image}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
                <Pressable style={styles.sideTap} onPress={onClose} accessibilityLabel="Kapat" />
              </View>
              <Pressable
                style={[styles.edgeTap, { height: bottomTapHeight }]}
                onPress={onClose}
                accessibilityLabel="Kapat"
              />
            </View>
          )}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Kapat">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {photos.length > 1 ? (
            <View style={styles.counter}>
              <Text variant="caption" style={styles.counterText}>
                {index + 1} / {photos.length}
              </Text>
            </View>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <View style={[styles.dots, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="none">
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { opacity: i === index ? 1 : 0.35, width: i === index ? 18 : 6 }]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    backgroundColor: '#000',
  },
  edgeTap: {
    width: '100%',
    zIndex: 2,
  },
  imageArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideTap: {
    width: 28,
    height: '100%',
  },
  imageFrame: {
    flex: 1,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  counterText: {
    color: '#fff',
    fontWeight: '600',
  },
  dots: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 3,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: MARKETPLACE_ACCENT,
  },
});
