import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_TABS } from '@/features/personnel-center/constants';
import type { PersonnelTab } from '@/features/personnel-center/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelTabBarProps = {
  value: PersonnelTab;
  onChange: (tab: PersonnelTab) => void;
  tabs?: typeof PERSONNEL_TABS;
  badgeCounts?: Partial<Record<PersonnelTab, number>>;
};

export function PersonnelTabBar({
  value,
  onChange,
  tabs = PERSONNEL_TABS,
  badgeCounts,
}: PersonnelTabBarProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];

  const content = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        const isUrgent = tab.id === 'urgent';
        const accent = isUrgent ? colors.danger : colors.primary;
        const badge = badgeCounts?.[tab.id] ?? 0;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? `${accent}22` : surface.chip,
                borderColor: active ? accent : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: active ? accent : colors.surfaceElevated },
              ]}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={active ? '#fff' : colors.textMuted}
              />
            </View>
            <Text
              variant="caption"
              style={{
                color: active ? accent : colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
            {badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text variant="caption" style={styles.badgeText}>
                  {badge > 9 ? '9+' : badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return isDark ? (
    <BlurView intensity={20} tint="dark" style={styles.shell}>
      {content}
    </BlurView>
  ) : (
    <View style={[styles.shell, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
