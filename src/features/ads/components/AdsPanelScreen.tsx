import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { AdCard } from '@/features/ads/components/AdCard';
import { AdPolicyPanel } from '@/features/ads/components/AdPolicyPanel';
import { AdWalletActivityFeed } from '@/features/ads/components/AdWalletActivityFeed';
import { AdWalletTopupPanel } from '@/features/ads/components/AdWalletTopupPanel';
import { ProfileBoostPanel } from '@/features/profile/components/ProfileBoostPanel';
import {
  AD_SESSION_HOURS,
  estimateClicksFromBudget,
  formatBudget,
  formatCpcKurus,
} from '@/features/ads/constants';
import { computeAdStats, fetchMyAds } from '@/features/ads/services/adData';
import { hasSeenAdPolicy } from '@/features/ads/services/adPolicySeen';
import { formatWalletBalance } from '@/features/ads/services/adBilling';
import { fetchAdWalletSummary } from '@/features/ads/services/adWallet';
import { fetchAdWalletLedger } from '@/features/ads/services/adWalletLedger';
import { fetchBusinessRecordByOwner, type BusinessProfile } from '@/features/profile/services/businessProfile';
import { businessCategoryLabel } from '@/features/businesses/constants';
import type { AdWalletLedgerEntry, AdWalletSummary } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AdsTab = 'campaigns' | 'wallet';

const ACCENT = '#7C3AED';

export function AdsPanelScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { topup } = useLocalSearchParams<{ topup?: string }>();
  const [ads, setAds] = useState<Awaited<ReturnType<typeof fetchMyAds>>>([]);
  const [wallet, setWallet] = useState<AdWalletSummary | null>(null);
  const [ledger, setLedger] = useState<AdWalletLedgerEntry[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<AdsTab>('campaigns');
  const [policySeen, setPolicySeen] = useState(false);

  const refreshPolicySeen = useCallback(() => {
    void hasSeenAdPolicy(user?.id).then(setPolicySeen);
  }, [user?.id]);

  useFocusEffect(refreshPolicySeen);

  const load = useCallback(async () => {
    if (!user) return;
    const [myAds, w, entries, biz] = await Promise.all([
      fetchMyAds(user.id),
      fetchAdWalletSummary(),
      fetchAdWalletLedger(),
      fetchBusinessRecordByOwner(user.id),
    ]);
    setAds(myAds);
    setWallet(w);
    setLedger(entries);
    setBusiness(biz);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (topup === 'success') {
      Alert.alert('Yükleme tamamlandı', 'Reklam cüzdanınıza bakiye eklendi.');
      setTab('wallet');
      void load();
      router.setParams({ topup: undefined });
    } else if (topup === 'cancelled') {
      router.setParams({ topup: undefined });
    }
  }, [topup, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = computeAdStats(ads);
  const isCampaigns = tab === 'campaigns';

  const listEmpty = !isCampaigns ? null : loading ? (
    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
  ) : (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: `${ACCENT}14` }]}>
        <Ionicons name="megaphone-outline" size={28} color={ACCENT} />
      </View>
      <Text variant="label" style={styles.emptyTitle}>
        Henüz kampanya yok
      </Text>
      <Text secondary variant="caption" style={styles.emptyText}>
        Stüdyodan ilk reklamınızı hazırlayın ve hedef kitlenize ulaşın.
      </Text>
      <Button
        title="Reklam Stüdyosu"
        size="compact"
        fullWidth={false}
        onPress={() => router.push('/ads/studio' as Href)}
      />
    </View>
  );

  return (
    <GradientBackground>
      <FlatList
        data={isCampaigns ? ads : []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
        ]}
        ListHeaderComponent={
          <>
            <AuthHeader
              compact
              title="Reklam Merkezi"
              subtitle={`Tıklama 8 kuruş · oturum ${AD_SESSION_HOURS} saat`}
            />

            <SegmentedTabs tab={tab} onChange={setTab} colors={colors} />

            {isCampaigns ? (
              <View style={styles.tabContent}>
                {wallet ? (
                  <BalanceStrip wallet={wallet} colors={colors} onTopup={() => setTab('wallet')} />
                ) : loading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
                ) : null}

                {business ? <StoreAdCard business={business} colors={colors} /> : null}

                {!loading ? (
                  <GlassCard padded={false} style={styles.summary}>
                    <View style={styles.summaryInner}>
                      <SummaryItem label="Kampanya" value={String(stats.totalAds)} colors={colors} />
                      <SummaryItem label="Aktif" value={String(stats.activeAds)} colors={colors} accent={colors.success} />
                      <SummaryItem label="Gösterim" value={String(stats.totalImpressions)} colors={colors} />
                      <SummaryItem label="Tıklama" value={String(stats.totalClicks)} colors={colors} />
                    </View>
                  </GlassCard>
                ) : null}

                <Button
                  title="Reklam Stüdyosu"
                  onPress={() => router.push('/ads/studio' as Href)}
                />
                <Text secondary variant="caption" style={styles.budgetHint}>
                  Toplam bütçe: {formatBudget(stats.totalBudgetCents)}
                </Text>

                <Text variant="caption" secondary style={styles.sectionLabel}>
                  Diğer tanıtım
                </Text>
                <ProfileBoostPanel inline onRefresh={load} />

                {ads.length > 0 ? (
                  <Text variant="label" style={styles.listTitle}>
                    Kampanyalarım
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.tabContent}>
                {loading && !wallet ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
                ) : wallet ? (
                  <AdWalletTopupPanel wallet={wallet} />
                ) : null}

                <AdWalletActivityFeed entries={ledger} loading={loading} />
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.adItem}>
            <AdCard ad={item} />
          </View>
        )}
        ListFooterComponent={
          policySeen ? null : (
            <View style={styles.footer}>
              <AdPolicyPanel compact />
            </View>
          )
        }
        ListEmptyComponent={listEmpty}
      />
    </GradientBackground>
  );
}

function SegmentedTabs({
  tab,
  onChange,
  colors,
}: {
  tab: AdsTab;
  onChange: (tab: AdsTab) => void;
  colors: { surface: string; border: string; text: string; textSecondary: string };
}) {
  const options: { key: AdsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'campaigns', label: 'Kampanyalar', icon: 'megaphone-outline' },
    { key: 'wallet', label: 'Cüzdan', icon: 'wallet-outline' },
  ];

  return (
    <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((option) => {
        const active = tab === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.segmentItem, active && { backgroundColor: ACCENT }]}
          >
            <Ionicons name={option.icon} size={15} color={active ? '#FFFFFF' : colors.textSecondary} />
            <Text
              variant="caption"
              style={{ fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BalanceStrip({
  wallet,
  colors,
  onTopup,
}: {
  wallet: AdWalletSummary;
  colors: { surface: string; border: string; text: string };
  onTopup: () => void;
}) {
  const estimatedClicks = estimateClicksFromBudget(wallet.balanceCents, wallet.cpcCents);

  return (
    <Pressable
      onPress={onTopup}
      style={({ pressed }) => [
        styles.balanceStrip,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.balanceIcon, { backgroundColor: `${ACCENT}16` }]}>
        <Ionicons name="wallet-outline" size={20} color={ACCENT} />
      </View>
      <View style={styles.balanceCopy}>
        <Text secondary variant="caption" style={{ fontSize: 11 }}>
          Reklam cüzdanı
        </Text>
        <Text variant="label" style={{ fontWeight: '800', fontSize: 16 }}>
          {formatWalletBalance(wallet.balanceCents)}
        </Text>
        <Text secondary variant="caption" style={{ fontSize: 10 }}>
          ~{estimatedClicks.toLocaleString('tr-TR')} tıklama · {formatCpcKurus(wallet.cpcCents)}
        </Text>
      </View>
      <View style={[styles.balanceCta, { backgroundColor: `${ACCENT}16` }]}>
        <Text variant="caption" style={{ color: ACCENT, fontWeight: '700' }}>
          Yükle
        </Text>
        <Ionicons name="chevron-forward" size={14} color={ACCENT} />
      </View>
    </Pressable>
  );
}

function StoreAdCard({
  business,
  colors,
}: {
  business: BusinessProfile;
  colors: { surface: string; border: string; text: string };
}) {
  return (
    <GlassCard style={styles.storeCard}>
      <View style={styles.storeHeader}>
        {business.logoUrl ? (
          <Image source={{ uri: business.logoUrl }} style={styles.storeLogo} contentFit="cover" />
        ) : (
          <View style={[styles.storeLogo, styles.storeLogoFallback, { backgroundColor: `${ACCENT}16` }]}>
            <Ionicons name="storefront-outline" size={22} color={ACCENT} />
          </View>
        )}
        <View style={styles.storeCopy}>
          <Text variant="label" numberOfLines={1} style={{ fontWeight: '800' }}>
            {business.name}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {businessCategoryLabel(business.category)} · Mağazanı öne çıkar
          </Text>
        </View>
        <View style={[styles.storeBadge, { backgroundColor: `${ACCENT}16` }]}>
          <Ionicons name="megaphone" size={16} color={ACCENT} />
        </View>
      </View>

      <Text secondary variant="caption" style={styles.storeHint}>
        Mağaza bilgilerin otomatik dolar; saniyeler içinde işletme reklamını yayına al.
      </Text>

      <Button
        title="Mağaza Reklamı Ver"
        onPress={() => router.push('/ads/studio?prefill=store' as Href)}
      />
    </GlassCard>
  );
}

function SummaryItem({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: { text: string; textMuted: string };
  accent?: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text variant="caption" secondary style={{ fontSize: 10 }}>
        {label}
      </Text>
      <Text variant="label" style={{ fontWeight: '800', fontSize: 15, color: accent ?? colors.text }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginBottom: spacing.md,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  tabContent: {
    gap: spacing.md,
  },
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCopy: {
    flex: 1,
    gap: 1,
  },
  balanceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  storeCard: {
    gap: spacing.sm,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  storeLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCopy: {
    flex: 1,
    gap: 2,
  },
  storeBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHint: {
    lineHeight: 16,
  },
  summary: {
    overflow: 'hidden',
  },
  summaryInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  budgetHint: {
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  sectionLabel: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  listTitle: {
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  adItem: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.md,
  },
  empty: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
