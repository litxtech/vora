import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  MARKETPLACE_ACCENT,
  MARKETPLACE_ACCENT_DEEP,
  MARKETPLACE_COMMISSION_RATE,
  MARKETPLACE_GRADIENT,
  marketplaceOffersPath,
  myListingsPath,
} from '@/features/marketplace/constants';
import { fetchMarketplaceListings } from '@/features/marketplace/services/listingData';
import { fetchBuyerOrders } from '@/features/marketplace/services/orderData';
import { countPendingOffers } from '@/features/marketplace/services/offerData';
import { computeSellerEarningsSummary, type SellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';
import { fetchSellerSales } from '@/features/marketplace/services/sellerSalesData';
import { MarketplaceSellerEarningsPanel } from '@/features/marketplace/components/MarketplaceSellerEarningsPanel';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const BANK_ACCENT = '#5C6BC0';
const SELL_ACCENT = '#43A047';
const BUY_ACCENT = '#1E88E5';

type HubStats = {
  listingCount: number;
  activeListings: number;
  buyerCount: number;
  sellerCount: number;
  totalSpent: number;
  netEarnings: number;
  pendingPayout: number;
  receivedOffersPending: number;
  sentOffersPending: number;
};

const EMPTY_STATS: HubStats = {
  listingCount: 0,
  activeListings: 0,
  buyerCount: 0,
  sellerCount: 0,
  totalSpent: 0,
  netEarnings: 0,
  pendingPayout: 0,
  receivedOffersPending: 0,
  sentOffersPending: 0,
};

export function MarketplaceAccountHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [earnings, setEarnings] = useState<SellerEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const regionId = resolveMarketplaceRegionId(profile?.region_id);
    const [listings, buyerOrders, sellerSales, offerCounts] = await Promise.all([
      fetchMarketplaceListings('mine', regionId, user.id),
      fetchBuyerOrders(user.id),
      fetchSellerSales(user.id),
      countPendingOffers(user.id),
    ]);

    const earningsSummary = computeSellerEarningsSummary(sellerSales);

    setStats({
      listingCount: listings.length,
      activeListings: listings.filter((l) => l.status === 'active' || l.status === 'reserved').length,
      buyerCount: buyerOrders.length,
      sellerCount: earningsSummary.saleCount,
      totalSpent: buyerOrders.reduce(
        (s, o) => s + (o.status !== 'cancelled' && o.status !== 'refunded' ? o.grossAmountCents : 0),
        0,
      ),
      netEarnings: earningsSummary.netCents,
      pendingPayout: earningsSummary.pendingPayoutCents,
      receivedOffersPending: offerCounts.receivedPending,
      sentOffersPending: offerCounts.sentPending,
    });
    setEarnings(earningsSummary.saleCount > 0 ? earningsSummary : null);
    setLoading(false);
  }, [user?.id, profile?.region_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MARKETPLACE_ACCENT} />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
      >
        <AuthHeader
          title="Hesabım"
          subtitle={firstName ? `${firstName} · Yerel Pazar paneli` : 'Yerel Pazar paneli'}
        />

        {loading && !refreshing ? (
          <ActivityIndicator color={MARKETPLACE_ACCENT} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            <LinearGradient
              colors={[`${MARKETPLACE_GRADIENT[0]}EE`, `${MARKETPLACE_GRADIENT[1]}AA`, `${MARKETPLACE_ACCENT_DEEP}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <Ionicons name="storefront" size={14} color="#fff" />
                  <Text variant="caption" style={styles.heroBadgeText}>
                    Yerel Pazar
                  </Text>
                </View>
                <Text variant="caption" style={styles.heroHint}>
                  Komisyon %{Math.round(MARKETPLACE_COMMISSION_RATE * 100)}
                </Text>
              </View>

              <View style={styles.heroMetrics}>
                <HeroMetric label="Net kazanç" value={formatCents(stats.netEarnings)} />
                <View style={styles.heroDivider} />
                <HeroMetric label="Toplam harcama" value={formatCents(stats.totalSpent)} />
              </View>

              <View style={styles.heroFooter}>
                <MiniStat icon="pricetags-outline" label={`${stats.listingCount} ilan`} />
                <MiniStat icon="radio-button-on-outline" label={`${stats.activeListings} yayında`} />
                <MiniStat icon="bag-check-outline" label={`${stats.sellerCount} satış`} />
                <MiniStat icon="cart-outline" label={`${stats.buyerCount} alış`} />
                {stats.receivedOffersPending + stats.sentOffersPending > 0 ? (
                  <MiniStat
                    icon="pricetag-outline"
                    label={`${stats.receivedOffersPending + stats.sentOffersPending} teklif bekliyor`}
                  />
                ) : null}
              </View>
            </LinearGradient>

            {stats.receivedOffersPending > 0 ? (
              <Pressable onPress={() => router.push(marketplaceOffersPath() as never)}>
                <GlassCard style={[styles.payoutBanner, { borderColor: `${MARKETPLACE_ACCENT}55` }]}>
                  <View style={[styles.payoutIcon, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
                    <Ionicons name="pricetag-outline" size={20} color={MARKETPLACE_ACCENT} />
                  </View>
                  <View style={styles.payoutBody}>
                    <Text variant="label">Yeni teklifler</Text>
                    <Text secondary variant="caption">
                      {stats.receivedOffersPending} alınan · {stats.sentOffersPending} verilen bekliyor
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </GlassCard>
              </Pressable>
            ) : null}

            {stats.pendingPayout > 0 ? (
              <Pressable onPress={() => router.push('/marketplace-center/seller' as never)}>
                <GlassCard style={[styles.payoutBanner, { borderColor: `${colors.warning}55` }]}>
                  <View style={[styles.payoutIcon, { backgroundColor: `${colors.warning}18` }]}>
                    <Ionicons name="time-outline" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.payoutBody}>
                    <Text variant="label">Ödeme bekleniyor</Text>
                    <Text secondary variant="caption">
                      {formatCents(stats.pendingPayout)} hesabınıza yatırılmayı bekliyor
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </GlassCard>
              </Pressable>
            ) : null}

            {earnings ? (
              <Pressable onPress={() => router.push('/marketplace-center/seller' as never)}>
                <MarketplaceSellerEarningsPanel summary={earnings} compact />
              </Pressable>
            ) : null}

            <Section label="Hızlı erişim">
              <View style={styles.tileGrid}>
                <ActionTile
                  icon="storefront-outline"
                  title="İlanlarım"
                  detail={`${stats.listingCount} kayıt · ${stats.activeListings} aktif`}
                  accent={MARKETPLACE_ACCENT}
                  onPress={() => router.push(myListingsPath() as never)}
                  large
                />
                <ActionTile
                  icon="add-circle-outline"
                  title="Yeni ilan"
                  detail="Ürününüzü listeleyin"
                  accent={MARKETPLACE_ACCENT}
                  onPress={() => router.push('/marketplace-center/create' as never)}
                />
                <ActionTile
                  icon="bag-outline"
                  title="Alışlarım"
                  detail={stats.buyerCount ? `${stats.buyerCount} sipariş` : 'Henüz alış yok'}
                  accent={BUY_ACCENT}
                  onPress={() => router.push('/marketplace-center/buyer' as never)}
                />
                <ActionTile
                  icon="trending-up-outline"
                  title="Satışlarım"
                  detail={
                    stats.sellerCount
                      ? `Brüt ${formatCents(earnings?.grossCents ?? 0)} · Net ${formatCents(stats.netEarnings)}`
                      : 'Henüz satış yok'
                  }
                  accent={SELL_ACCENT}
                  onPress={() => router.push('/marketplace-center/seller' as never)}
                />
                <ActionTile
                  icon="pricetag-outline"
                  title="Tekliflerim"
                  detail={
                    stats.receivedOffersPending + stats.sentOffersPending > 0
                      ? `${stats.receivedOffersPending} alınan · ${stats.sentOffersPending} verilen bekliyor`
                      : 'Alınan ve verilen teklifler'
                  }
                  accent="#AB47BC"
                  onPress={() => router.push(marketplaceOffersPath() as never)}
                />
              </View>
            </Section>

            <Section label="Banka & ödemeler">
              <Pressable onPress={() => router.push('/marketplace-center/payout-profile' as never)}>
                <GlassCard style={styles.bankCard}>
                  <LinearGradient
                    colors={[`${BANK_ACCENT}22`, `${colors.surface}00`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={[styles.bankIcon, { backgroundColor: `${BANK_ACCENT}20` }]}>
                    <Ionicons name="card-outline" size={24} color={BANK_ACCENT} />
                  </View>
                  <View style={styles.bankBody}>
                    <Text variant="label">IBAN & ödeme profili</Text>
                    <Text secondary variant="caption">
                      Satış gelirlerinizin yatırılacağı banka hesabı
                    </Text>
                    <Text variant="caption" style={{ color: BANK_ACCENT, fontWeight: '700', marginTop: 4 }}>
                      {stats.pendingPayout > 0 ? `${formatCents(stats.pendingPayout)} bekliyor` : 'Hesabı yönet →'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </GlassCard>
              </Pressable>
            </Section>

            <Section label="Belgeler">
              <GlassCard style={styles.docCard}>
                <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                <Text secondary variant="caption" style={styles.docText}>
                  Alış ve satış özetlerini PDF olarak indirebilirsiniz — ilgili ekrandaki{' '}
                  <Text variant="caption" style={{ fontWeight: '700' }}>PDF özeti</Text> butonunu kullanın. Belgelerde
                  Vora logosu ve markası yer alır.
                </Text>
              </GlassCard>
            </Section>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" style={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text variant="caption" style={styles.heroMetricLabel}>
        {label}
      </Text>
      <Text variant="h2" style={styles.heroMetricValue}>
        {value}
      </Text>
    </View>
  );
}

function MiniStat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.85)" />
      <Text variant="caption" style={styles.miniStatText}>
        {label}
      </Text>
    </View>
  );
}

function ActionTile({
  icon,
  title,
  detail,
  accent,
  onPress,
  large,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  accent: string;
  onPress: () => void;
  large?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        large && styles.tileWide,
        { borderColor: `${accent}33`, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <LinearGradient
        colors={[`${accent}16`, `${colors.surface}44`]}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius.xl }]}
      />
      <View style={[styles.tileIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={large ? 24 : 22} color={accent} />
      </View>
      <View style={large ? styles.tileWideBody : undefined}>
        <Text variant="label" style={styles.tileTitle}>
          {title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {large ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroBadgeText: { color: '#fff', fontWeight: '700' },
  heroHint: { color: 'rgba(255,255,255,0.75)' },
  heroMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  heroMetric: { flex: 1, gap: 2 },
  heroMetricLabel: { color: 'rgba(255,255,255,0.8)' },
  heroMetricValue: { color: '#fff', fontWeight: '800', fontSize: 26 },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: spacing.md,
  },
  heroFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  payoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutBody: { flex: 1, gap: 2 },
  section: { gap: spacing.sm },
  sectionLabel: { letterSpacing: 0.3 },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 118,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  tileWide: {
    width: '100%',
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tileWideBody: { flex: 1, gap: 2 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontWeight: '800' },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  bankIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBody: { flex: 1, gap: 3 },
  docCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  docText: { flex: 1, lineHeight: 18 },
});
