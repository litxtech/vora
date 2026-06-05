import { Pressable, ScrollView, StyleSheet } from 'react-native';
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FEED_FILTERS.map((filter) => {
        const active = category === filter.id;
        return (
          <Pressable
            key={filter.id}
            onPress={() => setCategory(filter.id)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? 'rgba(30,136,229,0.15)' : colors.surface,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '600' : '400' }}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
