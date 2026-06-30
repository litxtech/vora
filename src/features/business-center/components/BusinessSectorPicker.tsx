import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationOptionSheet } from '@/components/location/LocationSheetPicker';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_SECTOR_OPTIONS,
  businessSectorIcon,
} from '@/features/business-center/constants';
import type { BusinessCategoryId } from '@/constants/registration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  label?: string;
  hint?: string;
  value: BusinessCategoryId | string | null;
  onChange: (id: BusinessCategoryId) => void;
  accent?: string;
  /** @deprecated Alt çekmece kullanıldığı için yok sayılır */
  compact?: boolean;
};

export function BusinessSectorPicker({
  label = 'Sektör',
  hint,
  value,
  onChange,
  accent,
}: Props) {
  const { colors } = useTheme();
  const tone = accent ?? colors.primary;
  const [open, setOpen] = useState(false);

  const selected = BUSINESS_SECTOR_OPTIONS.find((s) => s.id === value) ?? null;
  const sheetOptions = BUSINESS_SECTOR_OPTIONS;

  const handleSelect = (id: BusinessCategoryId | null) => {
    if (id) onChange(id);
  };

  return (
    <>
      <View style={styles.wrap}>
        {label ? <Text variant="label">{label}</Text> : null}
        {hint ? (
          <Text secondary variant="caption">
            {hint}
          </Text>
        ) : null}

        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.trigger,
            selected
              ? {
                  borderColor: `${tone}55`,
                  backgroundColor: `${tone}10`,
                }
              : {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
          ]}
        >
          {selected ? (
            <View style={[styles.iconShell, { backgroundColor: `${tone}18` }]}>
              <Ionicons name={businessSectorIcon(selected.id)} size={20} color={tone} />
            </View>
          ) : (
            <View style={[styles.iconShell, { backgroundColor: `${colors.textMuted}14` }]}>
              <Ionicons name="storefront-outline" size={20} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.triggerMeta}>
            <Text variant="label" style={{ color: selected ? colors.text : colors.textMuted }}>
              {selected?.label ?? 'Sektör seçin'}
            </Text>
            <Text secondary variant="caption">
              {selected ? 'Değiştirmek için dokunun' : 'Listeyi açmak için dokunun'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <LocationOptionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={hint}
        value={(value as BusinessCategoryId | null) ?? null}
        options={sheetOptions}
        onSelect={handleSelect}
        searchable
        searchPlaceholder="Sektör ara… (ör. restoran, sağlık, turizm)"
        accent={tone}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  triggerMeta: { flex: 1, gap: 2 },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
