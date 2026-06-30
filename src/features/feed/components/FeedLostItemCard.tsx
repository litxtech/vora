import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatLostTimeAgo } from '@/features/lost-found/constants';
import { LostItemAvatar } from '@/features/lost-found/components/LostItemAvatar';
import { navigateToFeedDetail, prefetchFeedDetail } from '@/features/feed/services/feedNavigation';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedLostItemCardProps = {
  item: FeedItem;
};

export const FeedLostItemCard = memo(function FeedLostItemCard({ item }: FeedLostItemCardProps) {
  const { colors } = useTheme();
  const imageUrl = item.mediaUrls[0] ?? null;
  const urgent = Boolean(item.isFeatured);
  const itemType = item.lostItemType ?? 'lost';

  const openDetail = () => {
    prefetchFeedDetail('lost_found', item.sourceId);
    navigateToFeedDetail('lost_found', item.sourceId, item.isDemo);
  };

  return (
    <Pressable
      style={[styles.card, { borderBottomColor: colors.border }]}
      onPress={openDetail}
    >
      <LostItemAvatar
        imageUrl={imageUrl}
        size={48}
        category={item.lostItemCategory ?? 'other'}
        urgent={urgent}
      />
      <View style={styles.meta}>
        <Text variant="label" numberOfLines={2} style={styles.title}>
          {item.title ?? (itemType === 'lost' ? 'Kayıp ilanı' : 'Buluntu ilanı')}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {urgent ? 'Acil ilan' : itemType === 'lost' ? 'Kayıp' : 'Buluntu'}
          {' · '}
          {formatLostTimeAgo(item.createdAt)}
        </Text>
        {item.locationLabel ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text secondary variant="caption" numberOfLines={1}>
              {item.locationLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
});
