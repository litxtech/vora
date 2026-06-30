import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HOTEL_ACCENT, HOTEL_FEED_TABS } from '@/features/hotel-center/constants';
import type { HotelFeedTab } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: HotelFeedTab;
  onChange: (tab: HotelFeedTab) => void;
  tabs?: typeof HOTEL_FEED_TABS;
};

export function HotelTabBar({ value, onChange, tabs = HOTEL_FEED_TABS }: Props) {
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
                backgroundColor: active ? `${HOTEL_ACCENT}18` : colors.surface,
                borderColor: active ? HOTEL_ACCENT : colors.border,
              },
            ]}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={active ? HOTEL_ACCENT : colors.textMuted}
            />
            <Text variant="caption" style={{ color: active ? HOTEL_ACCENT : colors.textMuted, fontWeight: '600' }}>
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
