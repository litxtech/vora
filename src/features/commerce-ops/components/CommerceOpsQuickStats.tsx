import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCommerceCents, MODULE_ACCENTS } from '@/features/commerce-ops/constants';
import type { CommerceOpsSummary } from '@/features/commerce-ops/types';
import { radius, spacing } from '@/constants/theme';

type StatItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

type Props = {
  summary: CommerceOpsSummary;
};

export function CommerceOpsQuickStats({ summary }: Props) {
  const items: StatItem[] = [
    {
      id: 'hotel-confirmed',
      label: 'Otel onaylı',
      value: String(summary.hotelConfirmed),
      hint: `${summary.hotelPayoutDue} ödeme sırada`,
      icon: 'bed-outline',
      accent: MODULE_ACCENTS.hotel,
    },
    {
      id: 'hotel-pending',
      label: 'Otel ödeme bekleyen',
      value: String(summary.hotelPendingPayment),
      hint: summary.hotelPayoutOverdue > 0 ? `${summary.hotelPayoutOverdue} gecikmiş` : 'Yeni rezervasyonlar',
      icon: 'time-outline',
      accent: MODULE_ACCENTS.hotel,
    },
    {
      id: 'marketplace',
      label: 'Pazar escrow',
      value: formatCommerceCents(summary.marketplaceEscrowCents),
      hint: `${summary.marketplaceApprovalPending} onay bekliyor`,
      icon: 'storefront-outline',
      accent: MODULE_ACCENTS.marketplace,
    },
    {
      id: 'rides',
      label: 'Yolculuk bekleyen',
      value: String(summary.ridesPendingReservations),
      hint: formatCommerceCents(summary.ridesEscrowCents) + ' escrow',
      icon: 'car-outline',
      accent: MODULE_ACCENTS.rides,
    },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <GlassCard key={item.id} style={styles.card} padded={false}>
          <View style={[styles.accent, { backgroundColor: item.accent }]} />
          <View style={styles.body}>
            <View style={[styles.iconWrap, { backgroundColor: `${item.accent}18` }]}>
              <Ionicons name={item.icon} size={18} color={item.accent} />
            </View>
            <Text secondary variant="caption" style={styles.label}>
              {item.label}
            </Text>
            <Text variant="label" style={[styles.value, { color: item.accent }]}>
              {item.value}
            </Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {item.hint}
            </Text>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    width: '48%',
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  accent: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: spacing.md,
    gap: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: { fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
});
