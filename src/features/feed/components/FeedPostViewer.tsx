import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const ESTIMATED_POST_HEIGHT = 520;

function scrollListToPostIndex(
  listRef: RefObject<FlatList<FeedItem> | null>,
  index: number,
  averageItemLength = ESTIMATED_POST_HEIGHT,
) {
  if (index <= 0) return;

  const estimatedOffset = Math.max((averageItemLength || ESTIMATED_POST_HEIGHT) * index, 0);
  listRef.current?.scrollToOffset({ offset: estimatedOffset, animated: false });

  setTimeout(() => {
    listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
  }, 120);
}

type FeedPostViewerProps = {
  items: FeedItem[];
  startIndex: number;
  visible: boolean;
  title?: string;
  preferDirectMediaPlayback?: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<FeedItem>) => void;
  onDeleted?: (id: string) => void;
};

export function FeedPostViewer({
  items,
  startIndex,
  visible,
  title = 'Gönderiler',
  preferDirectMediaPlayback = false,
  onClose,
  onUpdate,
  onDeleted,
}: FeedPostViewerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const listRef = useRef<FlatList<FeedItem>>(null);
  const [localItems, setLocalItems] = useState(items);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const listSessionKey = useMemo(
    () => `${startIndex}:${items[startIndex]?.id ?? 'none'}`,
    [items, startIndex],
  );

  const initialRenderCount = useMemo(
    () => Math.min(Math.max(startIndex + 3, 8), Math.max(items.length, 1)),
    [items.length, startIndex],
  );

  useEffect(() => {
    if (!visible) return;
    setLocalItems(items);
    setActiveIndex(startIndex);
    if (startIndex <= 0) return;

    requestAnimationFrame(() => {
      scrollListToPostIndex(listRef, startIndex);
    });
    const retry = setTimeout(() => {
      scrollListToPostIndex(listRef, startIndex);
    }, 250);

    return () => clearTimeout(retry);
  }, [visible, items, startIndex]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<FeedItem>) => {
      setLocalItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      onUpdate(id, patch);
    },
    [onUpdate],
  );

  const handleDeleted = useCallback(
    (id: string) => {
      setLocalItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (next.length === 0) onClose();
        return next;
      });
      onDeleted?.(id);
    },
    [onClose, onDeleted],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  if (!visible || localItems.length === 0) return null;

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} presentationStyle="fullScreen" onRequestClose={onClose}>
      <GradientBackground>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
          <ScreenBackButton onPress={onClose} style={styles.closeBtn} />
          <Text variant="label">{title}</Text>
          <Text secondary variant="caption">
            {activeIndex + 1}/{localItems.length}
          </Text>
        </View>

        <FlatList
          key={listSessionKey}
          ref={listRef}
          data={localItems}
          keyExtractor={(item) => item.id}
          initialNumToRender={initialRenderCount}
          renderItem={({ item, index }) => (
            <View style={styles.postWrap}>
              <FeedPostCard
                item={item}
                preferDirectMediaPlayback={preferDirectMediaPlayback}
                isScreenFocused={visible}
                isRowVisible={index === activeIndex}
                onUpdate={(patch) => handleUpdate(item.id, patch)}
                onDeleted={onDeleted ? () => handleDeleted(item.id) : undefined}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            scrollListToPostIndex(listRef, info.index, info.averageItemLength);
          }}
        />
      </GradientBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: spacing.xs },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  postWrap: { marginBottom: spacing.lg },
});
