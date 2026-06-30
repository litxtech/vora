import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { EventAvatar } from '@/features/events/components/EventAvatar';
import { EVENT_CENTER_DEF, eventDetailPath, formatEventDateCompact, isEventLiveNow } from '@/features/events/constants';
import type { EventListing } from '@/features/events/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeaturedEventsCarouselProps = {
  events: EventListing[];
  onSeeAll?: () => void;
};

export function FeaturedEventsCarousel({ events, onSeeAll }: FeaturedEventsCarouselProps) {
  const { colors } = useTheme();

  if (events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${EVENT_CENTER_DEF.accent}18` }]}>
            <Ionicons name="calendar" size={14} color={EVENT_CENTER_DEF.accent} />
          </View>
          <Text variant="label">Etkinlikler</Text>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Tümü
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {[...events]
          .sort((a, b) => {
            const aLive = isEventLiveNow(a.startsAt, a.endsAt);
            const bLive = isEventLiveNow(b.startsAt, b.endsAt);
            if (aLive !== bLive) return aLive ? -1 : 1;
            return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
          })
          .map((event) => {
          const live = isEventLiveNow(event.startsAt, event.endsAt);

          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(eventDetailPath(event.id) as never)}
              style={styles.item}
            >
              <EventAvatar coverUrl={event.coverUrl} size={52} live={live} />
              <Text variant="caption" numberOfLines={2} style={[styles.title, { color: colors.text }]}>
                {event.title}
              </Text>
              <Text secondary variant="caption" numberOfLines={1} style={styles.meta}>
                {live ? 'Şimdi' : formatEventDateCompact(event.startsAt)}
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
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
