import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { LOST_CENTER_DEF, LOST_TABS } from '@/features/lost-found/constants';
import type { LostTab } from '@/features/lost-found/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LostTabBarProps = {
  value: LostTab;
  onChange: (tab: LostTab) => void;
  tabs?: typeof LOST_TABS;
};

export function LostTabBar({ value, onChange, tabs = LOST_TABS }: LostTabBarProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];
  const accent = LOST_CENTER_DEF.accent;

  const content = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        const chipColor = tab.id === 'urgent' ? colors.danger : accent;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? `${chipColor}18` : surface.chip,
                borderColor: active ? chipColor : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: active ? chipColor : colors.surfaceElevated },
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
                color: active ? chipColor : colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
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
});
