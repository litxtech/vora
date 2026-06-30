import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_NEED_FEED_TABS, VORA_NEEDS_ACCENT } from '@/features/vora-needs/constants';
import type { VoraNeedFeedTab } from '@/features/vora-needs/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type VoraNeedTabBarProps = {
  value: VoraNeedFeedTab;
  onChange: (tab: VoraNeedFeedTab) => void;
  tabs?: typeof VORA_NEED_FEED_TABS;
};

export function VoraNeedTabBar({ value, onChange, tabs = VORA_NEED_FEED_TABS }: VoraNeedTabBarProps) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? `${VORA_NEEDS_ACCENT}18` : colors.surface,
                borderColor: active ? VORA_NEEDS_ACCENT : colors.border,
              },
            ]}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={active ? VORA_NEEDS_ACCENT : colors.textMuted}
            />
            <Text variant="caption" style={{ color: active ? VORA_NEEDS_ACCENT : colors.textMuted, fontWeight: '600' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
