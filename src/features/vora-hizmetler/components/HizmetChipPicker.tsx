import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: string;
  color?: string;
};

type HizmetChipPickerProps<T extends string> = {
  label?: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
};

export function HizmetChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  scrollable = true,
}: HizmetChipPickerProps<T>) {
  const { colors } = useTheme();

  const chips = options.map((option) => {
    const selected = value === option.value;
    const accent = option.color ?? VORA_HIZMETLER_ACCENT;

    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? `${accent}18` : colors.surfaceElevated,
            borderColor: selected ? accent : colors.border,
          },
        ]}
      >
        {option.icon ? (
          <Ionicons
            name={option.icon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={selected ? accent : colors.textSecondary}
          />
        ) : null}
        <Text
          variant="caption"
          style={{
            color: selected ? accent : colors.textSecondary,
            fontWeight: selected ? '700' : '500',
          }}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.row, styles.wrapRow]}>{chips}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  wrapRow: {
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
