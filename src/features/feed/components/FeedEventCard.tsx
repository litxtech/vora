import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { EventAvatar } from '@/features/events/components/EventAvatar';
import { formatEventDateCompact, isEventLiveNow } from '@/features/events/constants';
import { navigateToFeedDetail, prefetchFeedDetail } from '@/features/feed/services/feedNavigation';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedEventCardProps = {
  item: FeedItem;
};

export const FeedEventCard = memo(function FeedEventCard({ item }: FeedEventCardProps) {
  const { colors } = useTheme();
  const coverUrl = item.mediaUrls[0] ?? null;
  const live = isEventLiveNow(item.createdAt, item.endsAt);

  const openDetail = () => {
    prefetchFeedDetail('event', item.sourceId);
    navigateToFeedDetail('event', item.sourceId, item.isDemo);
  };

  return (
    <Pressable
      style={[styles.card, { borderBottomColor: colors.border }]}
      onPress={openDetail}
    >
      <EventAvatar coverUrl={coverUrl} size={48} live={live} />
      <View style={styles.meta}>
        <Text variant="label" numberOfLines={2} style={styles.title}>
          {item.title ?? 'Etkinlik'}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {live ? 'Şimdi devam ediyor' : formatEventDateCompact(item.createdAt)}
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
