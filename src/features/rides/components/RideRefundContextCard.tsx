import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { RIDES_ACCENT } from '@/features/rides/constants';
import type { RideRefundContext } from '@/features/rides/services/refundContextData';
import { buildRideRefundContextLines } from '@/features/rides/services/refundContextData';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text variant="caption" secondary style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="caption" style={[styles.rowValue, { color: colors.text }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const DISPLAY_LABELS: Record<string, string> = {
  'Rezervasyon no': 'Rezervasyon no',
  Yolcu: 'Yolcu',
  Sürücü: 'Sürücü',
  Rota: 'Güzergah',
  'Ara duraklar': 'Ara duraklar',
  Kalkış: 'Kalkış',
  Buluşma: 'Buluşma noktası',
  İniş: 'İniş noktası',
  Araç: 'Araç',
  Plaka: 'Plaka',
  Koltuk: 'Koltuk',
  Tutar: 'Ödenen tutar',
  Rezervasyon: 'Rezervasyon durumu',
  Ödeme: 'Ödeme durumu',
  Yolculuk: 'Yolculuk durumu',
  'Yolcu notu': 'Yolcu notu',
};

export function RideRefundContextCard({ context }: { context: RideRefundContext }) {
  const { colors } = useTheme();
  const lines = buildRideRefundContextLines(context).filter(
    (line) => !line.startsWith('Rezervasyon ID:') && !line.startsWith('Yolculuk ID:'),
  );

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.refBadge, { backgroundColor: `${RIDES_ACCENT}18` }]}>
          <Ionicons name="ticket-outline" size={16} color={RIDES_ACCENT} />
          <Text variant="label" style={{ color: RIDES_ACCENT }}>
            {context.referenceCode}
          </Text>
        </View>
        <Text variant="caption" secondary>
          Atanan rezervasyon numarası
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {lines.map((line) => {
        const colon = line.indexOf(':');
        if (colon < 0) return null;
        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        return <DetailRow key={key} label={DISPLAY_LABELS[key] ?? key} value={value} />;
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    gap: 4,
  },
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  rowLabel: {
    width: 118,
    flexShrink: 0,
    lineHeight: 18,
  },
  rowValue: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
});
