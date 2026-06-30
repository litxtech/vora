import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MyListingRow } from '@/features/marketplace/components/MyListingRow';
import {
  LISTING_STATUS_LABELS,
  MARKETPLACE_ACCENT,
  marketplaceAccountPath,
} from '@/features/marketplace/constants';
import { fetchMarketplaceListings } from '@/features/marketplace/services/listingData';
import type { MarketplaceListing, MarketplaceListingStatus } from '@/features/marketplace/types';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type StatusFilter = 'all' | MarketplaceListingStatus;

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: LISTING_STATUS_LABELS.active },
  { id: 'reserved', label: LISTING_STATUS_LABELS.reserved },
  { id: 'sold', label: LISTING_STATUS_LABELS.sold },
  { id: 'removed', label: LISTING_STATUS_LABELS.removed },
];

export function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const regionId = resolveMarketplaceRegionId(profile?.region_id);
    setListings(await fetchMarketplaceListings('mine', regionId, user.id));
    setLoading(false);
  }, [user?.id, profile?.region_id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? listings : listings.filter((l) => l.status === filter)),
    [listings, filter],
  );

  const stats = useMemo(() => {
    const counts: Record<string, number> = { active: 0, reserved: 0, sold: 0 };
    for (const l of listings) {
      if (counts[l.status] != null) counts[l.status] += 1;
    }
    return counts;
  }, [listings]);

  return (
    <GradientBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.md,
          gap: spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        ListHeaderComponent={
          <>
            <AuthHeader
              title="İlanlarım"
              subtitle="Tüm ilanlarınızı tek yerden yönetin"
            />
            <GlassCard style={styles.summary}>
              <View style={styles.summaryRow}>
                <SummaryCell label="Aktif" value={stats.active} color="#43A047" />
                <SummaryCell label="Rezerve" value={stats.reserved} color="#FFB300" />
                <SummaryCell label="Satıldı" value={stats.sold} color="#78909C" />
              </View>
            </GlassCard>
            <View style={styles.actions}>
              <Button title="Yeni ilan ver" onPress={() => router.push('/marketplace-center/create' as never)} />
              <Pressable onPress={() => router.push(marketplaceAccountPath() as never)} style={styles.accountLink}>
                <Ionicons name="grid-outline" size={14} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary }}>
                  Hesap paneline dön
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTER_OPTIONS.map((opt) => {
                const active = filter === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setFilter(opt.id)}
                    style={[
                      styles.filterChip,
                      active
                        ? { backgroundColor: MARKETPLACE_ACCENT, borderColor: MARKETPLACE_ACCENT }
                        : { borderColor: colors.border },
                    ]}
                  >
                    <Text variant="caption" style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => <MyListingRow listing={item} onChanged={load} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text secondary>Bu filtrede ilan yok.</Text>
              <Button title="İlan ver" onPress={() => router.push('/marketplace-center/create' as never)} />
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={load}
      />
    </GradientBackground>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text variant="label" style={{ color, fontSize: 18 }}>
        {value}
      </Text>
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  accountLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  filters: { gap: spacing.xs, marginBottom: spacing.md, paddingRight: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
