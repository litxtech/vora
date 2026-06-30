import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatCount } from '@/features/profile/constants';
import type { ProfileTab } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TabOption = {
  id: ProfileTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ProfileTabBarProps = {
  tabs: TabOption[];
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  counts?: Partial<Record<ProfileTab, number>>;
  /** Çiplerin sağında, aynı barda gösterilecek ek öğe (ör. görüntülenme sayacı). */
  trailing?: ReactNode;
};

export function ProfileTabBar({ tabs, value, onChange, counts, trailing }: ProfileTabBarProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const count = counts?.[tab.id];
        const showCount = typeof count === 'number' && count > 0;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}22` : `${colors.surface}88`,
              },
            ]}
          >
            <Ionicons name={tab.icon} size={14} color={active ? colors.primary : colors.textMuted} />
            <Text
              variant="caption"
              style={{
                color: active ? colors.primary : colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
            {showCount ? (
              <View
                style={[
                  styles.countPill,
                  { backgroundColor: active ? `${colors.primary}2E` : `${colors.textMuted}1F` },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {formatCount(count)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.lg },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  trailing: { justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countPill: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
