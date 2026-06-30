import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatContribution,
  rideCityName,
  RIDES_ACCENT,
  TRIP_STATUS_LABELS,
  tripDetailPath,
} from '@/features/rides/constants';
import type { RideTrip, RideTripStatus } from '@/features/rides/types';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TripCategory = 'ongoing' | 'finished';

type Props = {
  trip: RideTrip;
  category: TripCategory;
};

const ONGOING_STATUSES: RideTripStatus[] = ['draft', 'published', 'full', 'in_progress'];

export function isOngoingTripStatus(status: RideTripStatus): boolean {
  return ONGOING_STATUSES.includes(status);
}

function routeLabel(trip: RideTrip): string {
  return `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
}

function categoryLabel(category: TripCategory): string {
  return category === 'ongoing' ? 'Devam eden' : 'Biten';
}

export function MyTripCompactCard({ trip, category }: Props) {
  const { colors } = useTheme();
  const isLive = trip.status === 'in_progress';
  const accent = category === 'ongoing' ? RIDES_ACCENT : colors.textMuted;

  return (
    <Pressable
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: isLive ? RIDES_ACCENT : colors.border,
        },
        isLive && styles.wrapLive,
      ]}
      onPress={() => router.push(tripDetailPath(trip.id) as never)}
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: `${accent}18` }]}>
          {isLive ? <View style={[styles.liveDot, { backgroundColor: RIDES_ACCENT }]} /> : null}
          <Text variant="caption" style={[styles.categoryText, { color: accent }]}>
            {categoryLabel(category)}
          </Text>
        </View>
        <Text variant="caption" secondary style={styles.statusText}>
          {TRIP_STATUS_LABELS[trip.status]}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="navigate-outline" size={13} color={RIDES_ACCENT} />
        <Text variant="caption" numberOfLines={1} style={styles.routeText}>
          {routeLabel(trip)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text variant="caption" secondary numberOfLines={1} style={styles.dateText}>
          {formatRideDeparture(trip.departureDate, trip.departureTime)}
        </Text>
        <Text variant="caption" style={styles.price}>
          {formatContribution(trip.contributionCents)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    gap: 4,
  },
  wrapLive: {
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeText: {
    flex: 1,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dateText: {
    flex: 1,
    fontSize: 11,
  },
  price: {
    fontWeight: '800',
    color: RIDES_ACCENT,
    fontSize: 12,
  },
});
