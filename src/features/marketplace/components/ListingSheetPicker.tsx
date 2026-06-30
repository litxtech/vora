import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  MarketplaceOptionSheet,
  type SheetOption,
} from '@/features/marketplace/components/MarketplaceOptionSheet';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type { SheetOption };

type ListingSheetPickerProps<T extends string> = {
  label: string;
  value: T;
  options: SheetOption<T>[];
  onChange: (value: T) => void;
  sheetTitle?: string;
  sheetSubtitle?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ListingSheetPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  sheetTitle,
  sheetSubtitle,
  placeholder = 'Seçin',
  searchPlaceholder,
  searchable = true,
  onOpenChange,
}: ListingSheetPickerProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);

  const setSheetOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <View style={styles.wrap}>
        <Text variant="label">{label}</Text>
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[
            styles.field,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text variant="body" style={{ flex: 1, color: selected ? colors.text : colors.textMuted }}>
            {selected?.label ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <MarketplaceOptionSheet
        visible={open}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle ?? label}
        subtitle={sheetSubtitle}
        value={value}
        options={options}
        onSelect={onChange}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
