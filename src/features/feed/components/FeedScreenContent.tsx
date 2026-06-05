import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedFilters } from '@/features/feed/components/FeedFilters';
import { FeedHeader } from '@/features/feed/components/FeedHeader';
import { FeedList } from '@/features/feed/components/FeedList';
import { NewPostsBanner } from '@/features/feed/components/NewPostsBanner';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { useFeedRealtime } from '@/features/feed/hooks/useFeedRealtime';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { useAuth } from '@/providers/AuthProvider';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function FeedScreenContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const setRegionId = useFeedStore((s) => s.setRegionId);
  const setDistrict = useFeedStore((s) => s.setDistrict);
  const resetNewPosts = useFeedStore((s) => s.resetNewPosts);

  const { items, loading, refreshing, loadingMore, error, refresh, loadMore, updateItem } =
    useFeed();

  useFeedRealtime();

  useEffect(() => {
    if (profile?.region_id) {
      setRegionId(profile.region_id as RegionId);
    }
    if (profile?.district) {
      setDistrict(profile.district);
    }
  }, [profile?.region_id, profile?.district, setRegionId, setDistrict]);

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.bannerSlot}>
        <NewPostsBanner
          onRefresh={() => {
            resetNewPosts();
            refresh();
          }}
        />
      </View>
      <FeedHeader />
      <FeedFilters />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <FeedList
        items={items}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        error={error}
        onRefresh={() => {
          resetNewPosts();
          refresh();
        }}
        onLoadMore={loadMore}
        onUpdateItem={updateItem}
        header={header}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.md },
  headerWrap: { gap: spacing.xs },
  bannerSlot: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
});
