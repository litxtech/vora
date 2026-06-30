import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Option<T extends string> = { id: T; label: string };

type OptionPickerProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
};

export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: OptionPickerProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? 'rgba(30,136,229,0.12)' : colors.surfaceElevated,
                },
              ]}
            >
              <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
