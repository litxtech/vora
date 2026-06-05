import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelOverlay } from '@/features/reels/components/ReelOverlay';
import { ReelPlayer } from '@/features/reels/components/ReelPlayer';
import { useReels } from '@/features/reels/hooks/useReels';
import { recordReelView } from '@/features/reels/services/reelsData';
import type { ReelItem } from '@/features/reels/types';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ReelsFeed() {
  const insets = useSafeAreaInsets();
  const viewedRef = useRef(new Set<string>());
  const { items, loading, activeIndex, setActiveIndex, loadMore, updateItem } = useReels();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        const item = items[idx];
        if (item && !viewedRef.current.has(item.id)) {
          viewedRef.current.add(item.id);
          recordReelView(item.id);
          updateItem(item.id, { viewCount: item.viewCount + 1 });
        }
      }
    },
    [items, setActiveIndex, updateItem],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text variant="h3" style={{ color: '#fff' }}>
          Reels
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.page}>
            <ReelPlayer item={item} isActive={index === activeIndex} />
            <ReelOverlay item={item} onUpdate={(patch) => updateItem(item.id, patch)} />
          </View>
        )}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  page: { width: '100%', height: SCREEN_HEIGHT },
});
