import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CENTER_GROUP_META } from '@/features/centers/constants';
import type { CenterGroup } from '@/features/centers/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type CenterFilterId = 'all' | CenterGroup;

type Chip = {
  id: CenterFilterId;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
};

type Props = {
  chips: Chip[];
  active: CenterFilterId;
  onChange: (id: CenterFilterId) => void;
};

export function CentersFilterChips({ chips, active, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      decelerationRate="fast"
    >
      {chips.map((chip) => {
        const selected = chip.id === active;
        const accent = chip.accent ?? colors.primary;

        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? `${accent}22` : colors.surface,
                borderColor: selected ? `${accent}55` : colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            {chip.icon ? (
              <View style={[styles.chipIcon, { backgroundColor: selected ? `${accent}28` : `${colors.textMuted}14` }]}>
                <Ionicons name={chip.icon} size={14} color={selected ? accent : colors.textMuted} />
              </View>
            ) : null}
            <Text
              variant="caption"
              style={{
                color: selected ? accent : colors.textSecondary,
                fontWeight: selected ? '700' : '500',
              }}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function buildCenterFilterChips(
  visibleGroups: { id: CenterGroup; label: string; count: number }[],
): Chip[] {
  return [
    { id: 'all', label: 'Tümü', icon: 'grid-outline' },
    ...visibleGroups.map((group) => ({
      id: group.id,
      label: group.label,
      icon: CENTER_GROUP_META[group.id].icon as keyof typeof Ionicons.glyphMap,
      accent: CENTER_GROUP_META[group.id].accent,
    })),
  ];
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
