import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type DetailMetaRowProps = {
  label: string;
  value: string;
};

export function DetailMetaRow({ label, value }: DetailMetaRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="body" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  value: {
    lineHeight: 22,
  },
});
