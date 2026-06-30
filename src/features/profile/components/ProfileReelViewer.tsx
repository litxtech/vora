import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReelOverlay } from '@/features/reels/components/ReelOverlay';
import { ReelPlayer } from '@/features/reels/components/ReelPlayer';
import { recordReelView } from '@/features/reels/services/reelsData';
import { getReelHotWindow } from '@/features/reels/services/reelWindow';
import { scheduleReelWarmup } from '@/features/reels/services/reelWarmup';
import type { ReelItem } from '@/features/reels/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ProfileReelViewerProps = {
  reels: ReelItem[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
  onReelDeleted?: (reelId: string) => void;
};

export function ProfileReelViewer({ reels, startIndex, visible, onClose, onReelDeleted }: ProfileReelViewerProps) {
  const insets = useSafeAreaInsets();
  const viewedRef = useRef(new Set<string>());
  const [items, setItems] = useState(reels);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  useEffect(() => {
    if (!visible || items.length === 0) return;
    scheduleReelWarmup(items, activeIndex);
  }, [visible, items, activeIndex]);

  const updateItem = (id: string, patch: Partial<ReelItem>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        const item = items[idx];
        if (item && !viewedRef.current.has(item.id)) {
          viewedRef.current.add(item.id);
          recordReelView(item.id).then((recorded) => {
            if (recorded) {
              updateItem(item.id, { viewCount: item.viewCount + 1 });
            }
          });
        }
      }
    },
    [items],
  );

  const handleReelDeleted = (reelId: string) => {
    setItems((prev) => {
      const next = prev.filter((r) => r.id !== reelId);
      if (next.length === 0) onClose();
      return next;
    });
    onReelDeleted?.(reelId);
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={[styles.closeBtn, { top: insets.top + 8 }]} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex > 0 ? startIndex : undefined}
          getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => {
            const { min, max } = getReelHotWindow(activeIndex, items.length);
            const inHotWindow = index >= min && index <= max;
            const isActive = visible && index === activeIndex;
            const shouldPreload = visible && inHotWindow && !isActive;

            return (
              <View style={styles.page}>
                <ReelPlayer item={item} isActive={isActive} shouldPreload={shouldPreload} />
                <ReelOverlay
                  item={item}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onDeleted={() => handleReelDeleted(item.id)}
                />
              </View>
            );
          }}
          windowSize={7}
          removeClippedSubviews={false}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  closeBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 8 },
  page: { height: SCREEN_HEIGHT, width: '100%' },
});
