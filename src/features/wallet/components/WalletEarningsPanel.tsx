import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCents, marketplaceAccountPath } from '@/features/marketplace/constants';
import { hotelEarningsPath } from '@/features/hotel-center/constants';
import { ridesAccountPath } from '@/features/rides/constants';
import { EARNINGS_ACCENT, EARNINGS_GRADIENT } from '@/features/wallet/constants';
import type { WalletActivityItem, WalletEarningsSummary } from '@/features/wallet/types';
import { computeWalletEarningsTotals } from '@/features/wallet/utils/earningsTotals';
import { radius, spacing } from '@/constants/theme';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useTheme } from '@/providers/ThemeProvider';
import { WalletActivityFeed } from '@/features/wallet/components/WalletActivityFeed';

type Props = {
  summary: WalletEarningsSummary;
  activities?: WalletActivityItem[];
};

type SourceItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  gradient: readonly [string, string];
  title: string;
  subtitle: string;
  amount?: number;
  pending?: number;
  onPress: () => void;
};

export function WalletEarningsPanel({ summary, activities = [] }: Props) {
  const { colors } = useTheme();
  const showMarketplace = useFeatureVisible('marketplace');
  const showRides = useFeatureVisible('rides');
  const showHotel = useFeatureVisible('hotel-center');

  const totals = computeWalletEarningsTotals(summary);
  const hasAnyActivity =
    summary.hasMarketplace ||
    summary.hasRides ||
    summary.hasHotel ||
    totals.totalNetCents > 0 ||
    totals.totalPendingCents > 0;

  const sources = buildSourceItems({
    summary,
    showMarketplace,
    showRides,
    showHotel,
  });

  if (!showMarketplace && !showRides && !showHotel) {
    return (
      <GlassCard style={styles.empty}>
        <Ionicons name="lock-closed-outline" size={28} color={colors.textMuted} />
        <Text variant="label">Kazanç özeti kapalı</Text>
        <Text variant="caption" secondary style={{ textAlign: 'center' }}>
          Bu bölüm şu an kullanılamıyor.
        </Text>
      </GlassCard>
    );
  }

  if (!hasAnyActivity) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[`${EARNINGS_GRADIENT[0]}DD`, `${EARNINGS_GRADIENT[1]}AA`, `${EARNINGS_GRADIENT[2]}88`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyHero}
        >
          <Ionicons name="trending-up" size={32} color="#fff" />
          <Text variant="h3" style={styles.emptyHeroTitle}>
            Kazanç yolculuğun başlasın
          </Text>
          <Text variant="caption" style={styles.emptyHeroSub}>
            Yerel Pazar&apos;da satış yapın, Paylaşımlı Yolculuk&apos;ta sürücü olun veya Otel Merkezi&apos;nde konaklama kazanın.
          </Text>
        </LinearGradient>
        <EarningsSourcesList items={sources} />
        <WalletActivityFeed
          items={activities}
          mode="try"
          title="TRY hareketleri"
          emptyTitle="TRY hareketi yok"
          emptyHint="Satış, yolculuk, otel rezervasyon ve reklam ödemeleri burada listelenir."
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${EARNINGS_GRADIENT[0]}EE`, `${EARNINGS_GRADIENT[1]}CC`, `${EARNINGS_GRADIENT[2]}99`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="cash" size={13} color="#fff" />
            <Text variant="caption" style={styles.heroBadgeText}>
              TRY Kazançları
            </Text>
          </View>
        </View>
        <Text
          style={styles.heroAmount}
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.55}
        >
          {formatCents(totals.totalNetCents)}
        </Text>
        <Text variant="caption" style={styles.heroSub}>
          Net toplam kazanç · {totals.activeSectorCount} sektör
        </Text>
        {totals.totalPaidCents > 0 ? (
          <Text variant="caption" style={styles.heroPaid}>
            {formatCents(totals.totalPaidCents)} hesaba yatırıldı
          </Text>
        ) : null}
        {totals.totalPendingCents > 0 ? (
          <View style={styles.pendingPill}>
            <Ionicons name="time" size={12} color="#fff" />
            <Text variant="caption" style={styles.pendingText}>
              {formatCents(totals.totalPendingCents)} ödeme bekliyor
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {hasAnyActivity ? <EarningsSectorChips items={sources} /> : null}

      <Text variant="label" style={styles.sectionTitle}>
        Sektörler
      </Text>

      <EarningsSourcesList items={sources} />

      <WalletActivityFeed
        items={activities}
        mode="try"
        title="TRY hareketleri"
        emptyTitle="TRY hareketi yok"
        emptyHint="Satış, yolculuk, otel rezervasyon ve reklam ödemeleri burada listelenir."
      />
    </View>
  );
}

function buildSourceItems({
  summary,
  showMarketplace,
  showRides,
  showHotel,
}: {
  summary: WalletEarningsSummary;
  showMarketplace: boolean;
  showRides: boolean;
  showHotel: boolean;
}): SourceItem[] {
  const items: SourceItem[] = [];

  if (showMarketplace) {
    items.push({
      key: 'marketplace',
      icon: 'storefront',
      accent: '#FF9800',
      gradient: ['#FF9800', '#E65100'],
      title: 'Yerel Pazar',
      subtitle: sectorSubtitle({
        count: summary.marketplaceSaleCount,
        countLabel: 'satış',
        paidCents: summary.marketplacePaidCents,
        pendingCents: summary.marketplacePendingCents,
        emptyHint: 'İlan vererek satış yapın',
      }),
      amount: summary.marketplaceNetCents,
      pending: summary.marketplacePendingCents,
      onPress: () => router.push(marketplaceAccountPath() as Href),
    });
  }

  if (showRides) {
    const ridesPending = summary.ridesPendingCents + summary.ridesScheduledCents;
    items.push({
      key: 'rides',
      icon: 'car',
      accent: '#2196F3',
      gradient: ['#2196F3', '#1565C0'],
      title: 'Paylaşımlı Yolculuk',
      subtitle: sectorSubtitle({
        count: summary.ridesTripCount,
        countLabel: 'yolculuk',
        paidCents: summary.ridesPaidCents,
        pendingCents: ridesPending,
        emptyHint: 'Sürücü olarak yolculuk paylaşın',
      }),
      amount: summary.ridesNetCents,
      pending: ridesPending,
      onPress: () => router.push(ridesAccountPath() as Href),
    });
  }

  if (showHotel) {
    const hotelPending = summary.hotelScheduledCents + summary.hotelEscrowCents;
    items.push({
      key: 'hotel',
      icon: 'bed',
      accent: '#00897B',
      gradient: ['#00897B', '#00695C'],
      title: 'Otel Merkezi',
      subtitle: sectorSubtitle({
        count: summary.hotelReservationCount,
        countLabel: 'rezervasyon',
        paidCents: summary.hotelPaidCents,
        pendingCents: hotelPending,
        emptyHint: 'Otel rezervasyonlarından kazanın',
      }),
      amount: summary.hotelNetCents,
      pending: hotelPending,
      onPress: () => router.push(hotelEarningsPath() as Href),
    });
  }

  return items;
}

function sectorSubtitle({
  count,
  countLabel,
  paidCents,
  pendingCents,
  emptyHint,
}: {
  count: number;
  countLabel: string;
  paidCents: number;
  pendingCents: number;
  emptyHint: string;
}): string {
  const hasActivity = count > 0 || paidCents > 0 || pendingCents > 0;
  if (!hasActivity) return emptyHint;

  const parts: string[] = [];
  if (count > 0) parts.push(`${count} ${countLabel}`);
  if (paidCents > 0) parts.push(`${formatCents(paidCents)} yatırıldı`);
  if (pendingCents > 0) parts.push(`${formatCents(pendingCents)} bekliyor`);
  return parts.length > 0 ? parts.join(' · ') : emptyHint;
}

function EarningsSectorChips({ items }: { items: SourceItem[] }) {
  const active = items.filter((item) => (item.amount ?? 0) > 0);
  if (active.length === 0) return null;

  return (
    <View style={styles.chipRow}>
      {active.map((item) => (
        <View
          key={item.key}
          style={[styles.sectorChip, { backgroundColor: `${item.accent}14`, borderColor: `${item.accent}30` }]}
        >
          <Ionicons name={item.icon} size={11} color={item.accent} />
          <Text variant="caption" style={[styles.sectorChipLabel, { color: item.accent }]} numberOfLines={1}>
            {item.title.split(' ')[0]}
          </Text>
          <Text variant="caption" style={[styles.sectorChipAmount, { color: item.accent }]}>
            {formatCents(item.amount!)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EarningsSourcesList({ items }: { items: SourceItem[] }) {
  const { colors } = useTheme();
  if (items.length === 0) return null;

  return (
    <GlassCard padded={false} style={styles.sourcesCard}>
      {items.map((item, index) => (
        <View key={item.key}>
          <EarningsSourceRow item={item} />
          {index < items.length - 1 ? (
            <View style={[styles.sourceDivider, { backgroundColor: colors.border }]} />
          ) : null}
        </View>
      ))}
    </GlassCard>
  );
}

function EarningsSourceRow({ item }: { item: SourceItem }) {
  const { colors } = useTheme();
  const hasAmount = item.amount != null && item.amount > 0;
  const hasPending = item.pending != null && item.pending > 0;

  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.sourceRow,
        pressed && { backgroundColor: `${item.accent}0C` },
      ]}
    >
      <View style={[styles.sourceAccent, { backgroundColor: item.accent }]} />
      <LinearGradient
        colors={[`${item.gradient[0]}28`, `${item.gradient[1]}14`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sourceIcon}
      >
        <Ionicons name={item.icon} size={17} color={item.accent} />
      </LinearGradient>
      <View style={styles.sourceBody}>
        <Text variant="label" style={styles.sourceTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="caption" secondary numberOfLines={1}>
          {item.subtitle}
        </Text>
        {hasPending ? (
          <View style={[styles.sourcePendingChip, { backgroundColor: `${EARNINGS_ACCENT}18` }]}>
            <Ionicons name="time-outline" size={10} color={EARNINGS_ACCENT} />
            <Text variant="caption" style={styles.sourcePendingText}>
              {formatCents(item.pending!)} bekliyor
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sourceTrailing}>
        {hasAmount ? (
          <Text
            style={[styles.sourceAmount, { color: item.accent }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatCents(item.amount!)}
          </Text>
        ) : (
          <Text variant="caption" style={{ color: item.accent, fontWeight: '600' }}>
            Başla
          </Text>
        )}
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  empty: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyHero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyHeroTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  emptyHeroSub: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 2,
    gap: spacing.xs,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
    width: '100%',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.78)',
  },
  heroPaid: {
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectorChipLabel: {
    fontWeight: '600',
    fontSize: 11,
    maxWidth: 72,
  },
  sectorChipAmount: {
    fontWeight: '800',
    fontSize: 11,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  pendingText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  sourcesCard: {
    overflow: 'hidden',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingRight: spacing.md,
    minHeight: 58,
  },
  sourceAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sourceTitle: {
    fontSize: 14,
  },
  sourcePendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sourcePendingText: {
    color: EARNINGS_ACCENT,
    fontWeight: '600',
    fontSize: 10,
  },
  sourceTrailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: 108,
  },
  sourceAmount: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.3,
    textAlign: 'right',
    flexShrink: 1,
  },
  sourceDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
});
