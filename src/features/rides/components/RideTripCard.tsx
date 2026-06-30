import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatContribution,
  formatRideTravelers,
  rideCityName,
  RIDES_ACCENT,
  TRIP_STATUS_LABELS,
  tripDetailPath,
} from '@/features/rides/constants';
import type { RideTrip } from '@/features/rides/types';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  trip: RideTrip;
  onToggleFavorite?: () => void;
};

function driverInitial(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function RideCardRoute({ trip }: { trip: RideTrip }) {
  const { colors } = useTheme();
  const stops = [...(trip.stops ?? [])]
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((s) => s.cityId)
    .filter((id) => id !== trip.fromCityId && id !== trip.toCityId);

  return (
    <View style={styles.routeCol}>
      <View style={styles.routeRow}>
        <View style={[styles.routeDot, { backgroundColor: '#1565C0' }]} />
        <Text variant="caption" numberOfLines={1} style={styles.routeCity}>
          {rideCityName(trip.fromCityId)}
        </Text>
      </View>

      {stops.map((cityId) => (
        <View key={cityId} style={styles.routeRow}>
          <View style={styles.routeStem}>
            <View style={[styles.routeLine, { backgroundColor: `${RIDES_ACCENT}55` }]} />
            <View style={[styles.routeDot, styles.routeDotStop, { backgroundColor: RIDES_ACCENT }]} />
          </View>
          <Text variant="caption" secondary numberOfLines={1} style={styles.routeCity}>
            {rideCityName(cityId)}
          </Text>
        </View>
      ))}

      <View style={styles.routeRow}>
        <View style={styles.routeStem}>
          {stops.length === 0 ? (
            <View style={[styles.routeLine, { backgroundColor: `${RIDES_ACCENT}55` }]} />
          ) : null}
          <View style={[styles.routeDot, { backgroundColor: '#F07167' }]} />
        </View>
        <Text variant="caption" numberOfLines={1} style={[styles.routeCity, { fontWeight: '800' }]}>
          {rideCityName(trip.toCityId)}
        </Text>
      </View>

      {stops.length > 0 ? (
        <Text variant="caption" secondary style={{ marginTop: 2, marginLeft: 18, color: colors.textMuted }}>
          {stops.length} ara durak
        </Text>
      ) : null}
    </View>
  );
}

export function RideTripCard({ trip, onToggleFavorite }: Props) {
  const { colors } = useTheme();
  const imageUri = trip.vehiclePhotoUrl;
  const driverLabel = trip.driverName ?? trip.driverUsername ?? 'Sürücü';
  const isOngoing = trip.status === 'in_progress';

  const seatsChipLabel = (() => {
    if (trip.status === 'draft') return 'Taslak';
    if (isOngoing) return formatRideTravelers(trip);
    return `${trip.availableSeats} koltuk`;
  })();

  return (
    <Pressable
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: isOngoing ? RIDES_ACCENT : colors.border },
        isOngoing && styles.wrapOngoing,
      ]}
      onPress={() => router.push(tripDetailPath(trip.id) as never)}
    >
      <View style={styles.thumbWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="car-outline" size={22} color={RIDES_ACCENT} />
          </View>
        )}
        <View style={[styles.seatsChip, isOngoing && styles.seatsChipOngoing]}>
          <Text variant="caption" style={styles.seatsText}>
            {seatsChipLabel}
          </Text>
        </View>
        {isOngoing ? (
          <View style={[styles.liveBanner, { backgroundColor: RIDES_ACCENT }]}>
            <Text variant="caption" style={styles.liveBannerText}>
              {TRIP_STATUS_LABELS.in_progress}
            </Text>
          </View>
        ) : null}
        {trip.status === 'draft' ? (
          <View style={[styles.draftBanner, { backgroundColor: colors.warning }]}>
            <Text variant="caption" style={styles.draftBannerText}>
              Listede görünmez
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.main}>
        <View style={styles.topRow}>
          <RideCardRoute trip={trip} />
          {onToggleFavorite ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              hitSlop={10}
              style={styles.favBtn}
            >
              <Ionicons
                name={trip.isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={trip.isFavorite ? RIDES_ACCENT : colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Text variant="caption" secondary numberOfLines={1} style={{ flex: 1 }}>
            {formatRideDeparture(trip.departureDate, trip.departureTime)}
            {trip.status === 'draft' ? ` · ${TRIP_STATUS_LABELS.draft}` : ''}
            {isOngoing ? ` · ${TRIP_STATUS_LABELS.in_progress}` : ''}
          </Text>
          <Text variant="caption" style={styles.price}>
            {formatContribution(trip.contributionCents)}
          </Text>
        </View>

        <View style={styles.driverRow}>
          {trip.driverAvatarUrl ? (
            <Image source={{ uri: trip.driverAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text variant="caption" style={styles.avatarInitial}>
                {driverInitial(trip.driverName ?? trip.driverUsername)}
              </Text>
            </View>
          )}
          <Text variant="caption" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
            {driverLabel}
          </Text>
          {trip.driverVerified ? (
            <Ionicons name="checkmark-circle" size={14} color="#43A047" />
          ) : null}
          {trip.womenOnly ? (
            <View style={[styles.tag, { backgroundColor: `${colors.primary}14` }]}>
              <Text variant="caption" style={{ fontSize: 10 }}>
                ♀
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const THUMB = 76;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    minHeight: THUMB + spacing.sm * 2,
  },
  wrapOngoing: {
    borderWidth: 1.5,
  },
  thumbWrap: {
    width: THUMB,
    alignSelf: 'stretch',
    position: 'relative',
  },
  thumb: {
    width: THUMB,
    flex: 1,
    minHeight: THUMB,
    backgroundColor: `${RIDES_ACCENT}12`,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatsChip: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  seatsChipOngoing: {
    bottom: 22,
  },
  seatsText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  liveBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  liveBannerText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  draftBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  draftBannerText: { color: '#1a1a1a', fontSize: 8, fontWeight: '800' },
  main: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    paddingLeft: spacing.sm,
    gap: 4,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  favBtn: {
    padding: 2,
    marginTop: -2,
  },
  routeCol: { flex: 1, gap: 2 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 16,
  },
  routeStem: {
    width: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  routeLine: {
    position: 'absolute',
    top: -6,
    bottom: 6,
    width: 2,
    borderRadius: 1,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeDotStop: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeCity: {
    flex: 1,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    fontWeight: '800',
    color: RIDES_ACCENT,
    fontSize: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ccc',
  },
  avatarFallback: {
    backgroundColor: `${RIDES_ACCENT}DD`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 10 },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
});
