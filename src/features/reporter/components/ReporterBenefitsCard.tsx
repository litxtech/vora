import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { REPORTER_BENEFITS, REPORTER_REQUIREMENTS } from '@/features/reporter/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function ReporterBenefitsCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="label">Program avantajları</Text>
      <View style={styles.benefits}>
        {REPORTER_BENEFITS.map((item) => (
          <View key={item.title} style={styles.benefitRow}>
            <View style={[styles.icon, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text variant="label" style={styles.benefitTitle}>
                {item.title}
              </Text>
              <Text variant="caption" secondary>
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text variant="label">Başvuru kriterleri</Text>
      {REPORTER_REQUIREMENTS.map((rule) => (
        <View key={rule} style={styles.ruleRow}>
          <Ionicons name="ellipse" size={6} color={colors.primary} />
          <Text variant="caption" secondary style={styles.ruleText}>
            {rule}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefits: { gap: spacing.sm },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  benefitTitle: { fontSize: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  ruleText: { flex: 1, lineHeight: 18 },
});
