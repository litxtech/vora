import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { InsightsTab } from '@/features/insights/constants';
import { INSIGHTS_ACCENT } from '@/features/insights/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { INSIGHTS_FEATURE } from '@/features/insights/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TabDef = {
  id: InsightsTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { id: 'overview', label: 'Özet', icon: 'grid-outline', iconActive: 'grid' },
  { id: 'trust', label: 'Güven', icon: 'shield-outline', iconActive: 'shield' },
  { id: 'content', label: 'İçerik', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
];

type Props = {
  value: InsightsTab;
  onChange: (tab: InsightsTab) => void;
};

export function InsightsTabBar({ value, onChange }: Props) {
  const { colors } = useTheme();
  const showOverview = useFeatureVisible(INSIGHTS_FEATURE.tab.overview);
  const showTrust = useFeatureVisible(INSIGHTS_FEATURE.tab.trust);
  const showContent = useFeatureVisible(INSIGHTS_FEATURE.tab.content);
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'overview') return showOverview;
    if (tab.id === 'trust') return showTrust;
    return showContent;
  });
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, visibleTabs.findIndex((t) => t.id === value));
  const tabWidth = barWidth > 0 && visibleTabs.length > 0 ? (barWidth - 8) / visibleTabs.length : 0;

  if (visibleTabs.length === 0) return null;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(activeIndex * tabWidth, { damping: 20, stiffness: 240 }) }],
    width: tabWidth,
  }));

  return (
    <View
      style={[styles.wrap, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 ? (
        <Animated.View style={[styles.indicator, { backgroundColor: INSIGHTS_ACCENT }, indicatorStyle]} />
      ) : null}
      {TABS.map((tab) => {
        const active = tab.id === value;
        if (tab.id === 'overview' && !showOverview) return null;
        if (tab.id === 'trust' && !showTrust) return null;
        if (tab.id === 'content' && !showContent) return null;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={15}
              color={active ? '#fff' : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: active ? '#fff' : colors.textSecondary,
                fontWeight: active ? '700' : '500',
                fontSize: 12,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    zIndex: 1,
  },
});
