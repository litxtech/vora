import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FilterOption<T extends string> = {
  id: T;
  label: string;
};

type AdminFilterChipProps<T extends string> = {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function AdminFilterChip<T extends string>({ options, value, onChange }: AdminFilterChipProps<T>) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : `${colors.surface}CC`,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onChange(option.id)}
          >
            <Text variant="caption" style={{ color: active ? colors.text : colors.textSecondary, fontWeight: '600' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
