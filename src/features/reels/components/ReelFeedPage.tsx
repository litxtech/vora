import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ReelOverlay } from '@/features/reels/components/ReelOverlay';
import { ReelPlayer } from '@/features/reels/components/ReelPlayer';
import { FLOATING_TAB_BAR_CONTENT_INSET } from '@/constants/tabBar';
import { useReelPlaybackSlot } from '@/features/reels/hooks/useReelPlaybackSlot';
import type { ReelItem } from '@/features/reels/types';

type ReelFeedPageProps = {
  item: ReelItem;
  index: number;
  isFocused: boolean;
  viewportHeight: number;
  viewportWidth: number;
  onUpdate: (patch: Partial<ReelItem>) => void;
  onDeleted: () => void;
};

function ReelFeedPageInner({
  item,
  index,
  isFocused,
  viewportHeight,
  viewportWidth,
  onUpdate,
  onDeleted,
}: ReelFeedPageProps) {
  const { isActive, shouldPreload, inHotWindow } = useReelPlaybackSlot(index, isFocused);

  return (
    <View style={[styles.page, { height: viewportHeight }]}>
      <ReelPlayer
        item={item}
        isActive={isActive}
        shouldPreload={shouldPreload}
        inHotWindow={inHotWindow}
        height={viewportHeight}
        width={viewportWidth}
      />
      <ReelOverlay
        item={item}
        tabBarInset={FLOATING_TAB_BAR_CONTENT_INSET}
        onUpdate={onUpdate}
        onDeleted={onDeleted}
      />
    </View>
  );
}

function reelFeedPagePropsEqual(prev: ReelFeedPageProps, next: ReelFeedPageProps): boolean {
  if (
    prev.index !== next.index ||
    prev.isFocused !== next.isFocused ||
    prev.viewportHeight !== next.viewportHeight ||
    prev.viewportWidth !== next.viewportWidth
  ) {
    return false;
  }

  const prevItem = prev.item;
  const nextItem = next.item;
  return (
    prevItem.id === nextItem.id &&
    prevItem.isLiked === nextItem.isLiked &&
    prevItem.likeCount === nextItem.likeCount &&
    prevItem.isSaved === nextItem.isSaved &&
    prevItem.saveCount === nextItem.saveCount &&
    prevItem.isFollowing === nextItem.isFollowing &&
    prevItem.commentCount === nextItem.commentCount &&
    prevItem.shareCount === nextItem.shareCount &&
    prevItem.viewCount === nextItem.viewCount
  );
}

export const ReelFeedPage = memo(ReelFeedPageInner, reelFeedPagePropsEqual);

const styles = StyleSheet.create({
  page: { width: '100%', overflow: 'hidden', backgroundColor: '#000' },
});
