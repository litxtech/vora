import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { GuestBanner } from '@/components/auth/GuestBanner';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedListProps = {
  items: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  onUpdateItem: (id: string, patch: Partial<FeedItem>) => void;
  header: React.ReactElement;
};

export function FeedList({
  items,
  loading,
  refreshing,
  loadingMore,
  error,
  onRefresh,
  onLoadMore,
  onUpdateItem,
  header,
}: FeedListProps) {
  const { colors } = useTheme();

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeedPostCard item={item} onUpdate={(patch) => onUpdateItem(item.id, patch)} />
      )}
      ListHeaderComponent={
        <View>
          {header}
          <GuestBanner />
          {error ? (
            <Text secondary style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text variant="h3">Henüz içerik yok</Text>
          <Text secondary>Bölgenizdeki paylaşımlar burada görünecek.</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  error: { marginBottom: spacing.md },
  footer: { marginVertical: spacing.lg },
});
