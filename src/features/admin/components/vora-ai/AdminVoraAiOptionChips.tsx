import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Option<T extends string | number> = {
  id: T;
  label: string;
};

type Props<T extends string | number> = {
  label: string;
  options: Option<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function AdminVoraAiOptionChips<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      <View style={styles.row}>
        {options.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={String(option.id)}
              disabled={disabled}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}18` : `${colors.surface}CC`,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              onPress={() => onChange(option.id)}
            >
              <Text
                variant="caption"
                numberOfLines={1}
                style={{
                  color: active ? colors.primary : colors.textSecondary,
                  fontWeight: '700',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  label: { fontWeight: '700' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    minHeight: 32,
    justifyContent: 'center',
  },
});
