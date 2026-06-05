import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

type StatBadgeProps = {
  value: string;
  label: string;
};

export function StatBadge({ value, label }: StatBadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text variant="h3" style={{ color: colors.accent }}>
        {value}
      </Text>
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flex: 1,
    minWidth: '45%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
