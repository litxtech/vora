import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { RegionId } from '@/constants/regions';
import { COMPOSE_HASHTAG_SUGGESTION_LIMIT } from '@/features/agenda/constants';
import { useAgendaHighlights } from '@/features/agenda/hooks/useAgendaHighlights';
import { extractHashtags } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ComposeHashtagSuggestionsProps = {
  regionId: RegionId;
  content: string;
  onAppendTag: (tag: string) => void;
};

export function ComposeHashtagSuggestions({
  regionId,
  content,
  onAppendTag,
}: ComposeHashtagSuggestionsProps) {
  const { colors } = useTheme();
  const { items } = useAgendaHighlights({
    regionId,
    limit: COMPOSE_HASHTAG_SUGGESTION_LIMIT,
    includePopular: true,
  });

  const usedTags = new Set(extractHashtags(content));
  const suggestions = items.slice(0, COMPOSE_HASHTAG_SUGGESTION_LIMIT);
  const available = suggestions.filter((item) => !usedTags.has(item.tag.toLowerCase()));

  if (available.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Ionicons name="pricetag-outline" size={11} color={colors.textMuted} />
        <Text variant="caption" secondary style={styles.label}>
          Gündemde
        </Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        {available.map((item) => {
          const label = item.label.startsWith('#') ? item.label : `#${item.label}`;
          return (
            <Pressable
              key={item.tag}
              onPress={() => onAppendTag(item.tag)}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text variant="caption" numberOfLines={1} style={[styles.chipText, { color: colors.primary }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 1,
    paddingRight: spacing.md,
  },
  chip: {
    flexShrink: 0,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
