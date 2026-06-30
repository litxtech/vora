import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_ACCENT,
  HOTEL_COMMISSION_RATE,
  HOTEL_GRADIENT,
  HOTEL_PAYOUT_HOLD_DAYS,
  formatHotelCents,
} from '@/features/hotel-center/constants';
import type { HotelOwnerEarningsSummary } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const NET_GREEN = '#43A047';
const COMMISSION_RED = '#EF5350';

type Props = {
  summary: HotelOwnerEarningsSummary;
  compact?: boolean;
};

export function HotelOwnerEarningsPanel({ summary, compact }: Props) {
  const { colors } = useTheme();
  const commissionPct = Math.round(HOTEL_COMMISSION_RATE * 100);
  const netRatio = summary.grossCents > 0 ? summary.netCents / summary.grossCents : 0;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${HOTEL_GRADIENT[0]}DD`, `${HOTEL_GRADIENT[1]}99`, '#00695C88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="wallet-outline" size={14} color="#fff" />
            <Text variant="caption" style={styles.heroBadgeText}>
              Net kazancınız
            </Text>
          </View>
          <Text variant="caption" style={styles.heroHint}>
            {summary.reservationCount} rezervasyon
          </Text>
        </View>
        <Text variant="h1" style={styles.heroAmount}>
          {formatHotelCents(summary.netCents)}
        </Text>
        {!compact ? (
          <View style={styles.heroSubRow}>
            <SubPill icon="checkmark-circle-outline" label={`Yatırılan ${formatHotelCents(summary.totalPaidCents)}`} />
            <SubPill
              icon="time-outline"
              label={`${HOTEL_PAYOUT_HOLD_DAYS} gün içinde ${formatHotelCents(summary.scheduledPayoutCents)}`}
            />
            <SubPill icon="lock-closed-outline" label={`Escrow ${formatHotelCents(summary.pendingEscrowCents)}`} />
          </View>
        ) : null}
      </LinearGradient>

      <GlassCard style={styles.breakdown}>
        <Text variant="label" style={styles.breakdownTitle}>
          Kazanç dökümü
        </Text>

        <BreakdownRow label="Brüt rezervasyon toplamı" value={formatHotelCents(summary.grossCents)} />
        <BreakdownRow
          label={`Platform komisyonu (%${commissionPct})`}
          value={`−${formatHotelCents(summary.commissionCents)}`}
          tone="deduction"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.netRow}>
          <Text variant="label">Net kazancınız</Text>
          <Text variant="label" style={{ color: NET_GREEN, fontWeight: '800', fontSize: 18 }}>
            {formatHotelCents(summary.netCents)}
          </Text>
        </View>

        {summary.grossCents > 0 ? (
          <View style={styles.barWrap}>
            <View style={[styles.barTrack, { backgroundColor: `${colors.border}88` }]}>
              <View style={[styles.barCommission, { width: `${(1 - netRatio) * 100}%`, backgroundColor: `${COMMISSION_RED}55` }]} />
              <View style={[styles.barNet, { width: `${netRatio * 100}%`, backgroundColor: `${NET_GREEN}88` }]} />
            </View>
            <View style={styles.barLegend}>
              <LegendDot color={COMMISSION_RED} label={`Komisyon %${commissionPct}`} />
              <LegendDot color={NET_GREEN} label="Net sizde" />
            </View>
          </View>
        ) : null}

        <Text variant="caption" secondary style={styles.payoutHint}>
          Konaklama tamamlandıktan sonra ödemeniz {HOTEL_PAYOUT_HOLD_DAYS} iş günü içinde hesabınıza yatırılır.
        </Text>
      </GlassCard>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'deduction';
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.breakdownRow}>
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text
        variant="caption"
        style={{ color: tone === 'deduction' ? COMMISSION_RED : colors.text, fontWeight: '700' }}
      >
        {value}
      </Text>
    </View>
  );
}

function SubPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.subPill}>
      <Ionicons name={icon} size={11} color="rgba(255,255,255,0.9)" />
      <Text variant="caption" style={styles.subPillText}>
        {label}
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
  wrap: { gap: spacing.sm },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  heroHint: { color: 'rgba(255,255,255,0.8)' },
  heroAmount: { color: '#fff', fontWeight: '900', fontSize: 36, marginTop: spacing.xs },
  heroSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  subPillText: { color: 'rgba(255,255,255,0.95)', fontSize: 11 },
  breakdown: { gap: spacing.sm, padding: spacing.md },
  breakdownTitle: { marginBottom: 2 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barWrap: { gap: spacing.xs, marginTop: spacing.xs },
  barTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barCommission: { height: '100%' },
  barNet: { height: '100%' },
  barLegend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  payoutHint: { marginTop: spacing.xs, lineHeight: 16 },
});
