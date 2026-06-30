import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT, formatServiceDate } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';

type HizmetEscrowBannerProps = {
  variant?: 'active' | 'completed' | 'paid_out';
  audience?: 'customer' | 'provider';
  payoutDueAt?: string | null;
  providerName?: string | null;
};

export function HizmetEscrowBanner({
  variant = 'active',
  audience = 'customer',
  payoutDueAt,
  providerName,
}: HizmetEscrowBannerProps) {
  const isProvider = audience === 'provider';

  if (variant === 'paid_out') {
    return (
      <GlassCard style={[styles.card, { borderColor: '#10B98140' }]}>
        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
        <View style={styles.body}>
          <Text variant="label" style={{ color: '#10B981' }}>
            {isProvider ? 'Kazancınız yatırıldı' : 'Ödeme ustaya aktarıldı'}
          </Text>
          <Text secondary variant="caption" style={styles.desc}>
            {isProvider
              ? 'Ödemeniz hesabınıza aktarıldı. Teşekkürler!'
              : 'İş tamamlandı ve usta ödemesi gerçekleştirildi.'}
          </Text>
        </View>
      </GlassCard>
    );
  }

  if (variant === 'completed') {
    const dueLabel = payoutDueAt
      ? `${formatServiceDate(payoutDueAt)} tarihine kadar`
      : '7 gün içinde';
    return (
      <GlassCard style={[styles.card, { borderColor: `${VORA_HIZMETLER_ACCENT}35` }]}>
        <Ionicons name="shield-checkmark" size={22} color={VORA_HIZMETLER_ACCENT} />
        <View style={styles.body}>
          <Text variant="label">{isProvider ? 'Ödemeniz planlandı' : 'Vora güvencesindesiniz'}</Text>
          <Text secondary variant="caption" style={styles.desc}>
            {isProvider
              ? `Müşteri işi tamamladı. Kazancınız ${dueLabel} hesabınıza yatırılacak.`
              : `İşi tamamladınız. Ödemeniz güvende; ${
                  providerName ? `${providerName} hesabına` : 'usta hesabına'
                } ${dueLabel} aktarılacak.`}
          </Text>
        </View>
      </GlassCard>
    );
  }

  if (isProvider) {
    return (
      <GlassCard style={[styles.card, { borderColor: `${VORA_HIZMETLER_ACCENT}35` }]}>
        <Ionicons name="shield-checkmark" size={22} color={VORA_HIZMETLER_ACCENT} />
        <View style={styles.body}>
          <Text variant="label">Ödeme alındı</Text>
          <Text secondary variant="caption" style={styles.desc}>
            Müşteri ödemeyi tamamladı. İş bitti onayından sonra kazancınız 7 gün içinde hesabınıza
            yatırılır.
          </Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, { borderColor: `${VORA_HIZMETLER_ACCENT}35` }]}>
      <Ionicons name="shield-checkmark" size={22} color={VORA_HIZMETLER_ACCENT} />
      <View style={styles.body}>
        <Text variant="label">Vora güvencesindesiniz</Text>
        <Text secondary variant="caption" style={styles.desc}>
          Ödemeniz işiniz teslim edilene kadar platformda güvende kalır. Memnun kaldığınızda{' '}
          <Text style={{ fontWeight: '700', color: VORA_HIZMETLER_ACCENT }}>İş Bitti</Text> deyin; usta
          hesabına 7 gün içinde aktarılır.
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  desc: {
    lineHeight: 18,
  },
});
