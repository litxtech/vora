import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { DISCOVERY_TABS } from '@/features/discovery/constants';
import type { DiscoveryTab } from '@/features/discovery/types';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type DiscoveryTabBarProps = {
  value: DiscoveryTab;
  onChange: (tab: DiscoveryTab) => void;
};

export function DiscoveryTabBar({ value, onChange }: DiscoveryTabBarProps) {
  const { colors } = useTheme();
  const visibleTabs = useFeatureTabFilter('discover', DISCOVERY_TABS);

  if (visibleTabs.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {visibleTabs.map((tab) => {
          const active = value === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={styles.tab}
            >
              <Text
                variant="caption"
                style={{
                  color: active ? colors.text : colors.textMuted,
                  fontWeight: active ? '700' : '500',
                  fontSize: active ? 13 : 12,
                }}
              >
                {tab.label}
              </Text>
              {active ? (
                <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
              ) : (
                <View style={styles.indicatorPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  tab: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    minWidth: 56,
  },
  indicator: {
    marginTop: spacing.sm,
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  indicatorPlaceholder: {
    marginTop: spacing.sm,
    height: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    marginTop: -2,
  },
});
