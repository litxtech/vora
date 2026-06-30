import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatCents } from '@/features/marketplace/constants';
import {
  PUAN_LABEL,
  WALLET_GRADIENT,
  WALLET_GRADIENT_DEEP,
} from '@/features/wallet/constants';
import type { TrustScoreSummary, WalletEarningsSummary } from '@/features/wallet/types';
import { computeWalletEarningsTotals } from '@/features/wallet/utils/earningsTotals';
import { formatPointsAmountParts } from '@/features/wallet/utils';
import { radius, spacing } from '@/constants/theme';

type Props = {
  points: TrustScoreSummary;
  earnings: WalletEarningsSummary;
};

export function WalletHeroCard({ points, earnings }: Props) {
  const pointParts = formatPointsAmountParts(points.balance, points.maxScore);
  const { totalNetCents, totalPendingCents } = computeWalletEarningsTotals(earnings);

  return (
    <LinearGradient
      colors={[`${WALLET_GRADIENT[0]}F2`, `${WALLET_GRADIENT[1]}E6`, `${WALLET_GRADIENT[2]}CC`, WALLET_GRADIENT_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="wallet" size={13} color="#fff" />
          <Text variant="caption" style={styles.badgeText}>
            Vora Cüzdan
          </Text>
        </View>
        <View style={styles.liveDot}>
          <View style={styles.livePulse} />
          <Text variant="caption" style={styles.liveText}>
            Canlı
          </Text>
        </View>
      </View>

      <View style={styles.balances}>
        <View style={styles.pointsRow}>
          <Text variant="caption" style={styles.balanceLabel}>
            {PUAN_LABEL}
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{pointParts.value}</Text>
            <Text style={styles.amountSuffix}>{pointParts.suffix}</Text>
          </View>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.tryRow}>
          <Text variant="caption" style={styles.balanceLabel}>
            TRY Kazanç
          </Text>
          <Text
            style={styles.tryValue}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.55}
          >
            {formatCents(totalNetCents)}
          </Text>
          {totalPendingCents > 0 ? (
            <Text
              variant="caption"
              style={styles.pendingText}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.75}
            >
              +{formatCents(totalPendingCents)} bekliyor
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <HeroChip
          icon="trending-up"
          label="Toplam kazanım"
          value={`+${points.lifetimeEarned.toLocaleString('tr-TR')} puan`}
        />
        <HeroChip
          icon="trending-down"
          label="Toplam düşüş"
          value={`-${points.lifetimeLost.toLocaleString('tr-TR')} puan`}
        />
      </View>
    </LinearGradient>
  );
}

function HeroChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.85)" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" style={styles.chipLabel}>
          {label}
        </Text>
        <Text variant="caption" style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    minHeight: 196,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbA: {
    width: 140,
    height: 140,
    top: -40,
    right: -30,
  },
  orbB: {
    width: 90,
    height: 90,
    bottom: -20,
    left: -10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  liveText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 11,
  },
  balances: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pointsRow: {
    gap: 4,
  },
  tryRow: {
    gap: 4,
    width: '100%',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  amountValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1,
  },
  amountSuffix: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tryValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
    width: '100%',
  },
  pendingText: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    width: '100%',
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.12)',
    minWidth: 0,
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
  },
  chipValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
