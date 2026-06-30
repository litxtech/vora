import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { FEED_FILTERS } from '@/features/feed/constants';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function FeedFilters() {
  const { colors } = useTheme();
  const category = useFeedStore((s) => s.category);
  const setCategory = useFeedStore((s) => s.setCategory);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FEED_FILTERS.map((filter) => {
        const active = category === filter.id;
        return (
          <InstantPressable
            key={filter.id}
            onPress={() => setCategory(filter.id)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}22` : colors.surface,
              },
            ]}
          >
            <Ionicons
              name={filter.icon}
              size={14}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: active ? colors.primary : colors.textSecondary,
                fontWeight: active ? '700' : '500',
              }}
            >
              {filter.label}
            </Text>
          </InstantPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
