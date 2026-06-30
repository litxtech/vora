import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { WalletTab } from '@/features/wallet/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { WALLET_FEATURE } from '@/features/wallet/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

type TabDef = {
  id: WalletTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { id: 'points', label: 'Puan', icon: 'shield-outline', iconActive: 'shield' },
  { id: 'earnings', label: 'Kazançlar', icon: 'wallet-outline', iconActive: 'wallet' },
];

type Props = {
  value: WalletTab;
  onChange: (tab: WalletTab) => void;
};

export function WalletTabBar({ value, onChange }: Props) {
  const { colors, metrics } = useTheme();
  const { radius, spacing } = metrics;
  const showPointsTab = useFeatureVisible(WALLET_FEATURE.tab.points);
  const showEarningsTab = useFeatureVisible(WALLET_FEATURE.tab.earnings);
  const visibleTabs = TABS.filter((tab) =>
    tab.id === 'points' ? showPointsTab : showEarningsTab,
  );
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
      style={[
        styles.wrap,
        {
          backgroundColor: `${colors.surface}CC`,
          borderColor: colors.border,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        },
      ]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.primary, borderRadius: radius.md },
            indicatorStyle,
          ]}
        />
      ) : null}
      {TABS.map((tab) => {
        const active = tab.id === value;
        if (tab.id === 'points' && !showPointsTab) return null;
        if (tab.id === 'earnings' && !showEarningsTab) return null;
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
              size={16}
              color={active ? '#fff' : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: active ? '#fff' : colors.textSecondary,
                fontWeight: active ? '700' : '500',
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
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    zIndex: 1,
  },
});
