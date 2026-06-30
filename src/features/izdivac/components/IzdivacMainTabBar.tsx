import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IZDIVAC_ACCENT, IZDIVAC_MAIN_TABS } from '@/features/izdivac/constants';
import type { IzdivacMainTab } from '@/features/izdivac/types';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: IzdivacMainTab;
  onChange: (tab: IzdivacMainTab) => void;
};

export function IzdivacMainTabBar({ value, onChange }: Props) {
  const { colors, isDark } = useTheme();
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.wrap, { backgroundColor: trackBg }]}>
      {IZDIVAC_MAIN_TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tab,
              active && {
                backgroundColor: isDark ? 'rgba(233,30,99,0.22)' : 'rgba(255,255,255,0.95)',
                borderColor: 'rgba(233,30,99,0.28)',
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={13}
              color={active ? IZDIVAC_ACCENT : colors.textMuted}
            />
            <Text
              variant="caption"
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? IZDIVAC_ACCENT : colors.textMuted },
                active && styles.labelActive,
              ]}
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
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
