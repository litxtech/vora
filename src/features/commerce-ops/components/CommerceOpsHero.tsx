import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { COMMERCE_OPS_GRADIENT, formatCommerceCents } from '@/features/commerce-ops/constants';
import type { CommerceOpsSummary } from '@/features/commerce-ops/types';
import { radius, spacing } from '@/constants/theme';

type Kpi = {
  label: string;
  hint: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  summary: CommerceOpsSummary;
};

export function CommerceOpsHero({ summary }: Props) {
  const pendingApproval =
    summary.marketplaceApprovalPending + summary.ridesPendingReservations + summary.hotelPendingPayment;

  const payoutOverdue =
    summary.marketplacePayoutOverdue + summary.ridesPayoutDue + summary.hotelPayoutOverdue;

  const kpis: Kpi[] = [
    {
      label: 'Escrow havuzu',
      hint: 'Henüz serbest bırakılmamış',
      value: formatCommerceCents(summary.totalEscrowCents),
      icon: 'lock-closed-outline',
    },
    {
      label: 'Son 24 saat',
      hint: 'Yeni işlem adedi',
      value: String(summary.transactions24h),
      icon: 'pulse-outline',
    },
    {
      label: 'Onay bekleyen',
      hint: 'Hemen müdahale gerekebilir',
      value: String(pendingApproval),
      icon: 'hourglass-outline',
    },
    {
      label: 'Gecikmiş ödeme',
      hint: 'Sahip / satıcı transferi',
      value: String(payoutOverdue),
      icon: 'alert-circle-outline',
    },
  ];

  return (
    <LinearGradient
      colors={[`${COMMERCE_OPS_GRADIENT[0]}F2`, `${COMMERCE_OPS_GRADIENT[1]}D9`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTop}>
        <View>
          <View style={styles.badge}>
            <Ionicons name="layers" size={14} color="#fff" />
            <Text variant="caption" style={styles.badgeText}>
              Canlı özet
            </Text>
          </View>
          <Text variant="label" style={styles.heroTitle}>
            Ekonomi Operasyon Merkezi
          </Text>
          <Text variant="caption" style={styles.heroHint}>
            Otel · Yerel Pazar · Yolculuk · Personel
          </Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.9)" />
        </View>
      </View>

      <View style={styles.grid}>
        {kpis.map((kpi) => (
          <View key={kpi.label} style={styles.kpi}>
            <View style={styles.kpiIconRow}>
              <Ionicons name={kpi.icon} size={15} color="rgba(255,255,255,0.9)" />
              <Text variant="caption" style={styles.kpiLabel}>
                {kpi.label}
              </Text>
            </View>
            <Text variant="label" style={styles.kpiValue}>
              {kpi.value}
            </Text>
            <Text variant="caption" style={styles.kpiHint}>
              {kpi.hint}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroHint: { color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpi: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  kpiIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  kpiValue: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  kpiHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 14 },
});
