import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IZDIVAC_TAB_OPTIONS } from '@/features/izdivac/constants';
import type { IzdivacTab } from '@/features/izdivac/types';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: IzdivacTab;
  onChange: (tab: IzdivacTab) => void;
  womenCount: number;
  menCount: number;
};

export function IzdivacTabBar({ value, onChange, womenCount, menCount }: Props) {
  const { colors, isDark } = useTheme();

  const counts: Record<IzdivacTab, number> = {
    women: womenCount,
    men: menCount,
  };

  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      {IZDIVAC_TAB_OPTIONS.map((tab) => {
        const active = tab.id === value;
        const accent = tab.id === 'women' ? '#E91E63' : '#1565C0';
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              active && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
                borderColor: `${accent}40`,
              },
            ]}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={12}
              color={active ? accent : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: active ? accent : colors.textMuted,
                fontWeight: active ? '800' : '600',
                fontSize: 11,
              }}
            >
              {tab.label}
            </Text>
            <View style={[styles.badge, { backgroundColor: active ? `${accent}20` : `${colors.textMuted}18` }]}>
              <Text variant="caption" style={{ fontSize: 9, fontWeight: '700', color: active ? accent : colors.textMuted }}>
                {counts[tab.id]}
              </Text>
            </View>
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
    gap: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  badge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
