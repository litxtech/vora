import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  isOngoingTripStatus,
  MyTripCompactCard,
} from '@/features/rides/components/MyTripCompactCard';
import { fetchRideTrips } from '@/features/rides/services/tripData';
import { RIDES_ACCENT } from '@/features/rides/constants';
import type { RideTrip } from '@/features/rides/types';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type TripRow =
  | { type: 'section'; key: string; title: string; icon: keyof typeof Ionicons.glyphMap; count: number }
  | { type: 'empty'; key: string; text: string }
  | { type: 'trip'; key: string; trip: RideTrip; category: 'ongoing' | 'finished' };

function SectionHeaderRow({
  title,
  icon,
  count,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${RIDES_ACCENT}14` }]}>
        <Ionicons name={icon} size={14} color={RIDES_ACCENT} />
      </View>
      <Text variant="label" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
        <Text variant="caption" secondary style={styles.countText}>
          {count}
        </Text>
      </View>
    </View>
  );
}

export function MyTripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<RideTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setTrips([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const regionId = resolveMarketplaceRegionId(profile?.region_id);
      void fetchRideTrips('mine', regionId, user.id)
        .then(setTrips)
        .finally(() => setLoading(false));
    }, [user?.id, profile?.region_id]),
  );

  const { ongoing, finished } = useMemo(() => {
    const ongoingTrips: RideTrip[] = [];
    const finishedTrips: RideTrip[] = [];
    for (const trip of trips) {
      if (isOngoingTripStatus(trip.status)) ongoingTrips.push(trip);
      else finishedTrips.push(trip);
    }
    return { ongoing: ongoingTrips, finished: finishedTrips };
  }, [trips]);

  const isEmpty = !loading && trips.length === 0;

  const listData = useMemo<TripRow[]>(() => {
    if (loading || isEmpty) return [];
    const rows: TripRow[] = [];

    rows.push({
      type: 'section',
      key: 'sec-ongoing',
      title: 'Devam eden yolculuklar',
      icon: 'radio-button-on-outline',
      count: ongoing.length,
    });
    if (ongoing.length === 0) {
      rows.push({ type: 'empty', key: 'empty-ongoing', text: 'Aktif veya planlanmış yolculuk yok.' });
    } else {
      for (const trip of ongoing) rows.push({ type: 'trip', key: `o-${trip.id}`, trip, category: 'ongoing' });
    }

    rows.push({
      type: 'section',
      key: 'sec-finished',
      title: 'Biten yolculuklar',
      icon: 'checkmark-done-outline',
      count: finished.length,
    });
    if (finished.length === 0) {
      rows.push({ type: 'empty', key: 'empty-finished', text: 'Tamamlanmış veya iptal edilmiş yolculuk yok.' });
    } else {
      for (const trip of finished) rows.push({ type: 'trip', key: `f-${trip.id}`, trip, category: 'finished' });
    }

    return rows;
  }, [loading, isEmpty, ongoing, finished]);

  const listHeader = (
    <>
      <AuthHeader title="Yolculuklarım" subtitle="Paylaştığınız yolculuklar" showBack />
      {!isEmpty ? (
        <GlassCard style={styles.summary} padded>
          <View style={styles.summaryRow}>
            <SummaryCell label="Devam eden" value={ongoing.length} color={RIDES_ACCENT} />
            <View style={styles.summaryDivider} />
            <SummaryCell label="Biten" value={finished.length} color="#78909C" />
          </View>
        </GlassCard>
      ) : null}
    </>
  );

  const renderItem = ({ item }: { item: TripRow }) => {
    if (item.type === 'section') {
      return <SectionHeaderRow title={item.title} icon={item.icon} count={item.count} />;
    }
    if (item.type === 'empty') {
      return (
        <Text secondary variant="caption" style={styles.emptySection}>
          {item.text}
        </Text>
      );
    }
    return <MyTripCompactCard trip={item.trip} category={item.category} />;
  };

  return (
    <GradientBackground>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={RIDES_ACCENT} style={styles.loader} />
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="car-outline" size={36} color={`${RIDES_ACCENT}88`} />
              <Text secondary style={styles.emptyTitle}>
                Henüz yolculuk paylaşmadınız
              </Text>
              <Text secondary variant="caption" style={styles.emptyHint}>
                Yeni bir yolculuk oluşturduğunuzda burada görünür.
              </Text>
            </View>
          )
        }
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        initialNumToRender={10}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    </GradientBackground>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  summary: {
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: 'rgba(128,128,128,0.35)',
  },
  loader: {
    marginTop: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyHint: {
    textAlign: 'center',
    maxWidth: 260,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardList: {
    gap: spacing.xs,
  },
  emptySection: {
    paddingLeft: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
