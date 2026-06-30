import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { spacing } from '@/constants/theme';

type ServicePaymentSectionProps = {
  amountLabel?: string;
};

export function ServicePaymentSection({ amountLabel }: ServicePaymentSectionProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.stripeIcon, { backgroundColor: '#635BFF18' }]}>
          <Ionicons name="card-outline" size={20} color="#635BFF" />
        </View>
        <View style={styles.headerText}>
          <Text variant="label">Güvenli ödeme</Text>
          <Text secondary variant="caption">
            Kart ile platform üzerinden
          </Text>
        </View>
      </View>

      {amountLabel ? (
        <View style={[styles.amountRow, { backgroundColor: `${VORA_HIZMETLER_ACCENT}10` }]}>
          <Text secondary variant="caption">
            Ödenecek tutar
          </Text>
          <Text variant="h3" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '800' }}>
            {amountLabel}
          </Text>
        </View>
      ) : null}

      <View style={[styles.note, { backgroundColor: `${VORA_HIZMETLER_ACCENT}10`, borderColor: `${VORA_HIZMETLER_ACCENT}30` }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={VORA_HIZMETLER_ACCENT} />
        <Text variant="caption" style={styles.noteText}>
          Vora güvencesindesiniz. Ödemeniz işiniz teslim edilene kadar platformda güvende kalır; memnun
          kaldığınızda İş Bitti dediğinizde usta hesabına 7 gün içinde aktarılır.
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stripeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  amountRow: {
    padding: spacing.md,
    borderRadius: 12,
    gap: 4,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    lineHeight: 17,
  },
});
