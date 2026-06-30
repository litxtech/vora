import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { ReporterApplication } from '@/features/reporter/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ReporterStatusCardProps =
  | { variant: 'reporter' }
  | { variant: 'pending'; application: ReporterApplication }
  | { variant: 'rejected'; application: ReporterApplication };

export function ReporterStatusCard(props: ReporterStatusCardProps) {
  const { colors } = useTheme();

  if (props.variant === 'reporter') {
    return (
      <View style={[styles.card, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}44` }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.success}20` }]}>
          <Ionicons name="mic" size={28} color={colors.success} />
        </View>
        <Text variant="h3" style={styles.title}>
          Aktif muhabirsiniz
        </Text>
        <Text secondary variant="caption" style={styles.body}>
          Akıştaki haber gönderilerinde doğrulama yaparak güven puanı kazanmaya devam edin.
        </Text>
      </View>
    );
  }

  if (props.variant === 'pending') {
    const sentAt = new Date(props.application.createdAt).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return (
      <View style={[styles.card, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}44` }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}20` }]}>
          <Ionicons name="time-outline" size={28} color={colors.warning} />
        </View>
        <Text variant="h3" style={styles.title}>
          Başvurunuz inceleniyor
        </Text>
        <Text secondary variant="caption" style={styles.body}>
          {sentAt} tarihinde gönderildi. Ekibimiz motivasyon ve deneyim metninizi değerlendiriyor.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}33` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.danger}18` }]}>
        <Ionicons name="close-circle-outline" size={28} color={colors.danger} />
      </View>
      <Text variant="h3" style={styles.title}>
        Başvuru reddedildi
      </Text>
      {props.application.reviewNote ? (
        <Text secondary variant="caption" style={styles.body}>
          {props.application.reviewNote}
        </Text>
      ) : (
        <Text secondary variant="caption" style={styles.body}>
          Gerekçe paylaşılmadı. Profilinizi güçlendirip yeniden başvurabilirsiniz.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
