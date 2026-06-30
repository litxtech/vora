import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { EventLiveAvatar } from '@/features/events/components/EventLiveAvatar';
import {
  EVENT_MAP_CATEGORY_COLORS,
  EVENT_MAP_CATEGORY_LABELS,
  eventCategoryLabel,
  eventDetailPath,
  formatEventCountdown,
  formatEventDate,
  isEventLiveNow,
} from '@/features/events/constants';
import type { EventListing } from '@/features/events/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EventCardProps = {
  event: EventListing;
  variant?: 'default' | 'compact';
};

function EventCardComponent({ event, variant = 'default' }: EventCardProps) {
  const { colors } = useTheme();
  const mapColor = EVENT_MAP_CATEGORY_COLORS[event.mapCategory];
  const live = isEventLiveNow(event.startsAt, event.endsAt);
  const countdown = formatEventCountdown(event.startsAt, event.endsAt);

  if (variant === 'compact') {
    return (
      <Pressable onPress={() => router.push(eventDetailPath(event.id) as never)} style={styles.compactWrap}>
        <EventLiveAvatar coverUrl={event.coverUrl} size={64} live={live} accentColor={mapColor} />
        <View style={styles.compactBody}>
          <Text variant="label" numberOfLines={2}>
            {event.title}
          </Text>
          <Text variant="caption" style={{ color: live ? '#FF3B30' : mapColor, fontWeight: '600' }}>
            {countdown}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(eventDetailPath(event.id) as never)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={[styles.cardInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.coverWrap}>
          {event.coverUrl ? (
            <Image source={{ uri: event.coverUrl }} style={styles.cover} />
          ) : (
            <LinearGradient
              colors={[`${mapColor}55`, `${mapColor}22`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverPlaceholder}
            >
              <Ionicons name="calendar" size={40} color={mapColor} />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.coverOverlay}
            pointerEvents="none"
          />

          <View style={styles.coverTop}>
            {event.isFeatured || event.isSponsored ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={11} color="#FFD54F" />
                <Text variant="caption" style={styles.featuredText}>
                  {event.isSponsored ? 'Sponsorlu' : 'Öne Çıkan'}
                </Text>
              </View>
            ) : null}
            {live ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text variant="caption" style={styles.liveText}>
                  CANLI
                </Text>
              </View>
            ) : (
              <View style={[styles.categoryBadge, { backgroundColor: `${mapColor}DD` }]}>
                <Text variant="caption" style={styles.categoryText}>
                  {EVENT_MAP_CATEGORY_LABELS[event.mapCategory]}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.coverBottom}>
            <Text variant="label" numberOfLines={2} style={styles.coverTitle}>
              {event.title}
            </Text>
            <Text variant="caption" style={styles.coverDate}>
              {live ? 'Şimdi devam ediyor' : formatEventDate(event.startsAt)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {event.locationName ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text secondary variant="caption" numberOfLines={1} style={styles.flex}>
                {event.locationName}
              </Text>
              {event.distanceKm != null ? (
                <Text variant="caption" style={{ color: mapColor, fontWeight: '600' }}>
                  {formatDistance(event.distanceKm)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <View style={[styles.typePill, { backgroundColor: `${mapColor}14` }]}>
                <Text variant="caption" style={{ color: mapColor, fontWeight: '600' }}>
                  {eventCategoryLabel(event.category)}
                </Text>
              </View>
              {event.myRsvp === 'going' ? (
                <View style={[styles.rsvpPill, { backgroundColor: `${colors.success}18` }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
                    Katılıyorsun
                  </Text>
                </View>
              ) : event.myRsvp === 'maybe' ? (
                <View style={[styles.rsvpPill, { backgroundColor: `${colors.warning}18` }]}>
                  <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                    Belki
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stats}>
              <Ionicons name="people" size={14} color={mapColor} />
              <Text variant="caption" style={{ fontWeight: '700' }}>
                {event.goingCount}
              </Text>
              {event.maybeCount > 0 ? (
                <Text secondary variant="caption">
                  +{event.maybeCount}
                </Text>
              ) : null}
            </View>
          </View>

          {event.businessName || event.organizerName ? (
            <View style={styles.organizerRow}>
              <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
              <Text secondary variant="caption" numberOfLines={1}>
                {event.businessName ?? event.organizerName}
              </Text>
            </View>
          ) : null}

          {!live && countdown !== formatEventDate(event.startsAt) ? (
            <Text variant="caption" style={{ color: mapColor, fontWeight: '600', marginTop: 2 }}>
              {countdown}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const EventCard = memo(EventCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardInner: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverWrap: {
    height: 180,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  coverTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverBottom: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    gap: 2,
  },
  coverTitle: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverDate: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  featuredText: {
    color: '#FFD54F',
    fontWeight: '700',
    fontSize: 11,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,59,48,0.9)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  rsvpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  compactBody: {
    flex: 1,
    gap: 2,
  },
});
