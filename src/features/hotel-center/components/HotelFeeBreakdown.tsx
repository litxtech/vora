import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_ACCENT,
  HOTEL_COMMISSION_RATE,
  formatHotelCents,
} from '@/features/hotel-center/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const DEDUCTION_COLOR = '#EF5350';

type Props = {
  grossCents: number;
  commissionCents?: number;
  ownerPayoutCents?: number;
  commissionRatePct?: number;
  role: 'guest' | 'owner';
  compact?: boolean;
};

export function HotelFeeBreakdown({
  grossCents,
  commissionCents,
  ownerPayoutCents,
  commissionRatePct,
  role,
  compact,
}: Props) {
  const { colors } = useTheme();
  const commission = commissionCents ?? Math.round(grossCents * HOTEL_COMMISSION_RATE);
  const net = ownerPayoutCents ?? grossCents - commission;
  const commissionPct = commissionRatePct ?? Math.round(HOTEL_COMMISSION_RATE * 100);

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text variant="caption" secondary>
          {role === 'guest'
            ? `Platform hizmet bedeli dahil · %${commissionPct} komisyon`
            : `Net ${formatHotelCents(net)} · komisyon ${formatHotelCents(commission)}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: `${colors.border}88`, backgroundColor: `${colors.surface}88` }]}>
      <Text variant="caption" style={styles.title}>
        {role === 'guest' ? 'Ödeme dökümü' : 'Kazanç dökümü'}
      </Text>

      {role === 'guest' ? (
        <>
          <FeeRow label="Otel konaklama payı" value={formatHotelCents(net)} />
          <FeeRow
            label={`Platform hizmet bedeli (%${commissionPct})`}
            value={formatHotelCents(commission)}
            tone="deduction"
          />
        </>
      ) : (
        <>
          <FeeRow label="Brüt rezervasyon" value={formatHotelCents(grossCents)} />
          <FeeRow
            label={`Platform komisyonu (%${commissionPct})`}
            value={`−${formatHotelCents(commission)}`}
            tone="deduction"
          />
        </>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.netRow}>
        <Text variant="label">{role === 'guest' ? 'Toplam ödeme' : 'Net kazancınız'}</Text>
        <Text variant="label" style={{ color: role === 'guest' ? HOTEL_ACCENT : '#43A047', fontWeight: '800' }}>
          {role === 'guest' ? formatHotelCents(grossCents) : formatHotelCents(net)}
        </Text>
      </View>
    </View>
  );
}

function FeeRow({
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
    <View style={styles.row}>
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text
        variant="caption"
        style={{ color: tone === 'deduction' ? DEDUCTION_COLOR : colors.text, fontWeight: '700' }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: { marginTop: 2 },
  title: { fontWeight: '700', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: { marginTop: 2 },
});
