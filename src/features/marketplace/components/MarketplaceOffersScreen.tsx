import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MarketplaceOfferRow } from '@/features/marketplace/components/MarketplaceOfferRow';
import {
  MARKETPLACE_ACCENT,
  marketplaceAccountPath,
  OFFER_STATUS_LABELS,
} from '@/features/marketplace/constants';
import {
  fetchReceivedOffers,
  fetchSentOffers,
} from '@/features/marketplace/services/offerData';
import type { MarketplaceOffer, MarketplaceOfferStatus } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'received' | 'sent';
type StatusFilter = 'all' | MarketplaceOfferStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: OFFER_STATUS_LABELS.pending },
  { id: 'accepted', label: OFFER_STATUS_LABELS.accepted },
  { id: 'rejected', label: OFFER_STATUS_LABELS.rejected },
];

export function MarketplaceOffersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('received');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [received, setReceived] = useState<MarketplaceOffer[]>([]);
  const [sent, setSent] = useState<MarketplaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [receivedData, sentData] = await Promise.all([
      fetchReceivedOffers(user.id),
      fetchSentOffers(user.id),
    ]);
    setReceived(receivedData);
    setSent(sentData);
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const source = tab === 'received' ? received : sent;
  const filtered = useMemo(
    () => (statusFilter === 'all' ? source : source.filter((o) => o.status === statusFilter)),
    [source, statusFilter],
  );

  const pendingReceived = received.filter((o) => o.status === 'pending').length;
  const pendingSent = sent.filter((o) => o.status === 'pending').length;

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MARKETPLACE_ACCENT} />
        }
        ListHeaderComponent={
          <>
            <AuthHeader title="Tekliflerim" subtitle="Aldığınız ve verdiğiniz teklifleri yönetin" />

            <View style={styles.tabRow}>
              <TabButton
                label="Alınan"
                count={pendingReceived}
                active={tab === 'received'}
                onPress={() => {
                  setTab('received');
                  setStatusFilter('all');
                }}
              />
              <TabButton
                label="Verilen"
                count={pendingSent}
                active={tab === 'sent'}
                onPress={() => {
                  setTab('sent');
                  setStatusFilter('all');
                }}
              />
            </View>

            <GlassCard style={styles.summary}>
              <Text variant="label">{tab === 'received' ? 'İlanlarınıza gelen' : 'Verdiğiniz'} teklifler</Text>
              <Text secondary variant="caption">
                {tab === 'received'
                  ? `${received.length} teklif · ${pendingReceived} bekliyor`
                  : `${sent.length} teklif · ${pendingSent} bekliyor`}
              </Text>
            </GlassCard>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setStatusFilter(f.id)}
                    style={[
                      styles.filterChip,
                      active
                        ? { backgroundColor: MARKETPLACE_ACCENT, borderColor: MARKETPLACE_ACCENT }
                        : { borderColor: colors.border },
                    ]}
                  >
                    <Text variant="caption" style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={() => router.push(marketplaceAccountPath() as never)} style={styles.backLink}>
              <Ionicons name="grid-outline" size={14} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary }}>
                Hesap paneli
              </Text>
            </Pressable>
          </>
        }
        renderItem={({ item }) => (
          <MarketplaceOfferRow offer={item} mode={tab} onChanged={load} />
        )}
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator color={MARKETPLACE_ACCENT} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text secondary style={styles.empty}>
              {tab === 'received' ? 'Henüz alınan teklif yok.' : 'Henüz verilen teklif yok.'}
            </Text>
          )
        }
      />
    </GradientBackground>
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        active
          ? { backgroundColor: MARKETPLACE_ACCENT, borderColor: MARKETPLACE_ACCENT }
          : { borderColor: colors.border, backgroundColor: `${colors.surface}88` },
      ]}
    >
      <Text variant="label" style={{ color: active ? '#fff' : colors.text }}>
        {label}
      </Text>
      {count > 0 ? (
        <View style={[styles.tabBadge, { backgroundColor: active ? '#fff' : MARKETPLACE_ACCENT }]}>
          <Text variant="caption" style={{ color: active ? MARKETPLACE_ACCENT : '#fff', fontWeight: '800', fontSize: 10 }}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  summary: { gap: spacing.xs, marginBottom: spacing.sm },
  filters: { gap: spacing.xs, marginBottom: spacing.md, paddingRight: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xxl },
});
