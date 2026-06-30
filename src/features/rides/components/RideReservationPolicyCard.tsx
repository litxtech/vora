import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { RIDE_RESERVATION_POLICY_POINTS, RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RideReservationPolicyCardProps = {
  accepted: boolean;
  onToggleAccepted: () => void;
  amountLabel?: string;
};

export function RideReservationPolicyCard({
  accepted,
  onToggleAccepted,
  amountLabel,
}: RideReservationPolicyCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { borderColor: `${RIDES_ACCENT}33`, backgroundColor: `${RIDES_ACCENT}08` }]}>
      <View style={styles.titleRow}>
        <Ionicons name="document-text-outline" size={16} color={RIDES_ACCENT} />
        <Text variant="label" style={{ color: RIDES_ACCENT, flex: 1 }}>
          Rezervasyon ve iade politikası
        </Text>
      </View>

      {amountLabel ? (
        <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
          Tahsil edilecek tutar (şoför onayında): {amountLabel}
        </Text>
      ) : null}

      {RIDE_RESERVATION_POLICY_POINTS.map((point) => (
        <View key={point} style={styles.pointRow}>
          <Text variant="caption" style={styles.bullet}>
            •
          </Text>
          <Text secondary variant="caption" style={styles.pointText}>
            {point}
          </Text>
        </View>
      ))}

      <Pressable
        onPress={onToggleAccepted}
        style={[styles.checkRow, { borderColor: accepted ? RIDES_ACCENT : colors.border }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <Ionicons
          name={accepted ? 'checkbox' : 'square-outline'}
          size={20}
          color={accepted ? RIDES_ACCENT : colors.textMuted}
        />
        <Text variant="caption" style={styles.checkText}>
          Politikayı okudum; rezervasyon öncesi tüm detayları sürücü ile netleştireceğimi ve aksi halde
          iade talebinin reddedilebileceğini kabul ediyorum.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  bullet: {
    lineHeight: 17,
    color: '#64748B',
  },
  pointText: {
    flex: 1,
    lineHeight: 17,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  checkText: {
    flex: 1,
    lineHeight: 17,
  },
});
