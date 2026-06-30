import { StyleSheet, View, type ReactNode } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ListingFormSection({ step, title, subtitle, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <LinearGradient colors={[`${MARKETPLACE_ACCENT}44`, `${MARKETPLACE_ACCENT}22`]} style={styles.step}>
          <Text variant="caption" style={styles.stepText}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.titles}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text secondary variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: MARKETPLACE_ACCENT, fontWeight: '800' },
  titles: { flex: 1, gap: 2 },
  body: { gap: spacing.sm },
});
