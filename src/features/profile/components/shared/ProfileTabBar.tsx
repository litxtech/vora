import { useEffect, useRef, type ReactNode } from 'react';
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
  const scrollRef = useRef<ScrollView>(null);
  const chipX = useRef<Partial<Record<ProfileTab, number>>>({});
  const shouldReveal = useRef(true);

  useEffect(() => {
    shouldReveal.current = true;
    const x = chipX.current[value];
    if (x == null) return;
    shouldReveal.current = false;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.md), animated: true });
  }, [value, tabs]);

  const reveal = (tab: ProfileTab) => {
    if (!shouldReveal.current || tab !== value) return;
    const x = chipX.current[tab];
    if (x == null) return;
    shouldReveal.current = false;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.md), animated: true });
  };

  return (
    <View style={styles.clip}>
    <ScrollView
      ref={scrollRef}
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const count = counts?.[tab.id];
        const showCount = typeof count === 'number';
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={showCount ? `${tab.label}, ${count}` : tab.label}
            onPress={() => onChange(tab.id)}
            onLayout={(event) => {
              chipX.current[tab.id] = event.nativeEvent.layout.x;
              if (active) reveal(tab.id);
            }}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}24` : colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons name={tab.icon} size={15} color={active ? colors.primary : colors.textMuted} />
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
              <Text
                variant="caption"
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: active ? colors.primary : colors.textMuted,
                }}
              >
                {formatCount(count)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </ScrollView>
    </View>
  );
}

const TAB_BAR_HEIGHT = 52;

const styles = StyleSheet.create({
  clip: {
    height: TAB_BAR_HEIGHT,
    maxHeight: TAB_BAR_HEIGHT,
    overflow: 'hidden',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  scroll: {
    height: TAB_BAR_HEIGHT,
    maxHeight: TAB_BAR_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    gap: spacing.sm,
    height: TAB_BAR_HEIGHT,
    paddingRight: spacing.sm,
    alignItems: 'center',
    flexGrow: 0,
  },
  trailing: { justifyContent: 'center', flexShrink: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
});
