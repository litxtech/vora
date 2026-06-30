import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { EventAvatar } from '@/features/events/components/EventAvatar';
import {
  EVENT_CENTER_DEF,
  eventDetailPath,
  formatEventDateCompact,
  isEventLiveNow,
} from '@/features/events/constants';
import type { EventListing } from '@/features/events/types';
import { LostItemAvatar } from '@/features/lost-found/components/LostItemAvatar';
import { formatLostTimeAgo, lostDetailPath } from '@/features/lost-found/constants';
import type { LostListing } from '@/features/lost-found/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SpotlightEntry =
  | { kind: 'event'; item: EventListing; sortKey: number }
  | { kind: 'lost'; item: LostListing; sortKey: number };

type FeedSpotlightCarouselProps = {
  events: EventListing[];
  lostItems: LostListing[];
};

const AVATAR_SIZE = 52;

function buildEntries(events: EventListing[], lostItems: LostListing[]): SpotlightEntry[] {
  const entries: SpotlightEntry[] = [];

  for (const event of events) {
    const live = isEventLiveNow(event.startsAt, event.endsAt);
    const sortKey = live ? 0 : 2;
    entries.push({ kind: 'event', item: event, sortKey });
  }

  for (const item of lostItems) {
    const sortKey = item.isUrgent ? 1 : 3;
    entries.push({ kind: 'lost', item, sortKey });
  }

  return entries.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    const aTime =
      a.kind === 'event'
        ? new Date(a.item.startsAt).getTime()
        : new Date(a.item.createdAt).getTime();
    const bTime =
      b.kind === 'event'
        ? new Date(b.item.startsAt).getTime()
        : new Date(b.item.createdAt).getTime();
    return bTime - aTime;
  });
}

export function FeedSpotlightCarousel({ events, lostItems }: FeedSpotlightCarouselProps) {
  const { colors } = useTheme();
  const entries = useMemo(() => buildEntries(events, lostItems), [events, lostItems]);

  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${EVENT_CENTER_DEF.accent}18` }]}>
            <Ionicons name="sparkles" size={14} color={EVENT_CENTER_DEF.accent} />
          </View>
          <Text variant="label">Etkinlik & Kayıp</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {entries.map((entry) => {
          if (entry.kind === 'event') {
            const event = entry.item;
            const live = isEventLiveNow(event.startsAt, event.endsAt);

            return (
              <Pressable
                key={`event-${event.id}`}
                onPress={() => router.push(eventDetailPath(event.id) as never)}
                style={styles.item}
              >
                <EventAvatar coverUrl={event.coverUrl} size={AVATAR_SIZE} live={live} />
                <Text variant="caption" numberOfLines={2} style={[styles.title, { color: colors.text }]}>
                  {event.title}
                </Text>
                <Text secondary variant="caption" numberOfLines={1} style={styles.meta}>
                  {live ? 'Canlı' : formatEventDateCompact(event.startsAt)}
                </Text>
              </Pressable>
            );
          }

          const item = entry.item;
          return (
            <Pressable
              key={`lost-${item.id}`}
              onPress={() => router.push(lostDetailPath(item.id) as never)}
              style={styles.item}
            >
              <LostItemAvatar
                imageUrl={item.mediaUrls[0] ?? null}
                size={AVATAR_SIZE}
                category={item.category}
                urgent={item.isUrgent}
              />
              <Text variant="caption" numberOfLines={2} style={[styles.title, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text secondary variant="caption" numberOfLines={1} style={styles.meta}>
                {item.isUrgent ? 'Acil' : item.itemType === 'lost' ? 'Kayıp' : 'Buluntu'}
                {' · '}
                {formatLostTimeAgo(item.createdAt)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { gap: spacing.md, paddingVertical: 2, paddingRight: spacing.md },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
  },
  meta: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
});
