import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  MARKETPLACE_ACCENT,
  MARKETPLACE_ACCENT_DEEP,
  MARKETPLACE_COMMISSION_RATE,
  MARKETPLACE_COMMISSION_RED,
  MARKETPLACE_GRADIENT,
  MARKETPLACE_SELL_GREEN,
} from '@/features/marketplace/constants';
import type { SellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  summary: SellerEarningsSummary;
  compact?: boolean;
};

export function MarketplaceSellerEarningsPanel({ summary, compact }: Props) {
  const { colors } = useTheme();
  const commissionPct = Math.round(MARKETPLACE_COMMISSION_RATE * 100);
  const netRatio = summary.grossCents > 0 ? summary.netCents / summary.grossCents : 0;
  const commissionRatio = summary.grossCents > 0 ? summary.commissionCents / summary.grossCents : 0;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${MARKETPLACE_GRADIENT[0]}EE`, `${MARKETPLACE_GRADIENT[1]}BB`, `${MARKETPLACE_ACCENT_DEEP}99`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroDecor} pointerEvents="none">
          <View style={styles.heroOrb} />
        </View>

        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="wallet" size={13} color="#fff" />
            <Text variant="caption" style={styles.heroBadgeText}>
              Net kazancınız
            </Text>
          </View>
          <View style={styles.saleCountPill}>
            <Ionicons name="bag-check-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text variant="caption" style={styles.saleCountText}>
              {summary.saleCount} satış
            </Text>
          </View>
        </View>

        <Text
          style={styles.heroAmount}
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.55}
        >
          {formatCents(summary.netCents)}
        </Text>

        {!compact ? (
          <>
            <View style={styles.heroStats}>
              <HeroStatCard
                icon="checkmark-circle"
                label="Yatırılan"
                value={formatCents(summary.paidOutCents)}
                tone="paid"
              />
              <HeroStatCard
                icon="time"
                label="Bekleyen"
                value={formatCents(summary.pendingPayoutCents)}
                tone="pending"
              />
            </View>
            {summary.manualSaleCount > 0 || summary.platformSaleCount > 0 ? (
              <View style={styles.heroMixRow}>
                <MixChip icon="storefront-outline" label={`${summary.platformSaleCount} platform`} />
                <MixChip icon="hand-left-outline" label={`${summary.manualSaleCount} manuel`} />
              </View>
            ) : null}
          </>
        ) : null}
      </LinearGradient>

      <GlassCard style={styles.breakdown}>
        <View style={styles.breakdownHead}>
          <View style={[styles.breakdownIcon, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
            <Ionicons name="pie-chart-outline" size={16} color={MARKETPLACE_ACCENT} />
          </View>
          <View style={styles.breakdownHeadText}>
            <Text variant="label">Kazanç dökümü</Text>
            <Text variant="caption" secondary>
              Brüt, komisyon ve net dağılım
            </Text>
          </View>
        </View>

        <BreakdownRow
          icon="trending-up-outline"
          label="Brüt satış toplamı"
          value={formatCents(summary.grossCents)}
          tone="neutral"
        />
        <BreakdownRow
          icon="remove-circle-outline"
          label={`Platform komisyonu (%${commissionPct})`}
          value={`−${formatCents(summary.commissionCents)}`}
          tone="deduction"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.netRow}>
          <View style={styles.netLabel}>
            <View style={[styles.netDot, { backgroundColor: MARKETPLACE_SELL_GREEN }]} />
            <Text variant="label">Net kazancınız</Text>
          </View>
          <Text variant="label" style={styles.netValue}>
            {formatCents(summary.netCents)}
          </Text>
        </View>

        {summary.grossCents > 0 ? (
          <View style={styles.barWrap}>
            <View style={styles.barLabels}>
              <Text variant="caption" style={{ color: MARKETPLACE_COMMISSION_RED, fontWeight: '700' }}>
                %{Math.round(commissionRatio * 100)} komisyon
              </Text>
              <Text variant="caption" style={{ color: MARKETPLACE_SELL_GREEN, fontWeight: '700' }}>
                %{Math.round(netRatio * 100)} net
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: `${colors.border}66` }]}>
              <View
                style={[
                  styles.barCommission,
                  { width: `${commissionRatio * 100}%`, backgroundColor: `${MARKETPLACE_COMMISSION_RED}66` },
                ]}
              />
              <View
                style={[styles.barNet, { width: `${netRatio * 100}%`, backgroundColor: `${MARKETPLACE_SELL_GREEN}99` }]}
              />
            </View>
            <View style={styles.barLegend}>
              <LegendDot color={MARKETPLACE_COMMISSION_RED} label="Platform payı" />
              <LegendDot color={MARKETPLACE_SELL_GREEN} label="Sizde kalan" />
            </View>
          </View>
        ) : null}
      </GlassCard>
    </View>
  );
}

function HeroStatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'paid' | 'pending';
}) {
  return (
    <View style={[styles.heroStatCard, tone === 'pending' && styles.heroStatCardPending]}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.9)" />
      <Text variant="caption" style={styles.heroStatLabel}>
        {label}
      </Text>
      <Text variant="caption" style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function MixChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.mixChip}>
      <Ionicons name={icon} size={11} color="rgba(255,255,255,0.85)" />
      <Text variant="caption" style={styles.mixChipText}>
        {label}
      </Text>
    </View>
  );
}

function BreakdownRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'neutral' | 'deduction' | 'net';
}) {
  const { colors } = useTheme();
  const iconColor = tone === 'deduction' ? MARKETPLACE_COMMISSION_RED : tone === 'net' ? MARKETPLACE_SELL_GREEN : colors.textMuted;
  const valueColor = tone === 'deduction' ? MARKETPLACE_COMMISSION_RED : tone === 'net' ? MARKETPLACE_SELL_GREEN : colors.text;

  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownRowLeft}>
        <View style={[styles.breakdownRowIcon, { backgroundColor: `${iconColor}14` }]}>
          <Ionicons name={icon} size={13} color={iconColor} />
        </View>
        <Text secondary variant="caption" style={styles.breakdownRowLabel}>
          {label}
        </Text>
      </View>
      <Text variant="caption" style={{ color: valueColor, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text secondary variant="caption" style={{ fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroDecor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  heroOrb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -40,
    marginRight: -30,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroBadgeText: { color: '#fff', fontWeight: '700' },
  saleCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  saleCountText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 11 },
  heroAmount: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 34,
    letterSpacing: -0.5,
    lineHeight: 42,
    width: '100%',
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroStatCard: {
    flex: 1,
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  heroStatCardPending: {
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  heroStatValue: { color: '#fff', fontWeight: '800', fontSize: 13 },
  heroMixRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mixChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  mixChipText: { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '600' },
  breakdown: { gap: spacing.sm, padding: spacing.md },
  breakdownHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  breakdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownHeadText: { flex: 1, gap: 1 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  breakdownRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  breakdownRowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownRowLabel: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  netLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netDot: { width: 8, height: 8, borderRadius: 4 },
  netValue: { color: MARKETPLACE_SELL_GREEN, fontWeight: '800', fontSize: 18 },
  barWrap: { gap: spacing.xs, marginTop: spacing.sm },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barCommission: { height: '100%' },
  barNet: { height: '100%' },
  barLegend: { flexDirection: 'row', gap: spacing.md, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
