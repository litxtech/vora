import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type PersonnelChipItem<T extends string> = {
  id: T;
  label: string;
  icon: string;
};

type PersonnelChipBarProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  items: PersonnelChipItem<T>[];
  badgeCounts?: Partial<Record<T, number>>;
  urgentIds?: T[];
};

export function PersonnelChipBar<T extends string>({
  value,
  onChange,
  items,
  badgeCounts,
  urgentIds = [],
}: PersonnelChipBarProps<T>) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.shell}
    >
      {items.map((item) => {
        const active = value === item.id;
        const isUrgent = urgentIds.includes(item.id);
        const accent = isUrgent ? colors.danger : colors.primary;
        const badge = badgeCounts?.[item.id] ?? 0;

        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? `${accent}18` : colors.surfaceElevated,
                borderColor: active ? accent : colors.border,
              },
            ]}
          >
            <Ionicons
              name={item.icon as keyof typeof Ionicons.glyphMap}
              size={13}
              color={active ? accent : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: active ? accent : colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }}
            >
              {item.label}
            </Text>
            {badge > 0 ? (
              <Text variant="caption" style={[styles.badge, { backgroundColor: colors.danger }]}>
                {badge > 9 ? '9+' : badge}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: spacing.sm,
    flexGrow: 0,
  },
  row: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badge: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 16,
    height: 16,
    lineHeight: 16,
    textAlign: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
});
