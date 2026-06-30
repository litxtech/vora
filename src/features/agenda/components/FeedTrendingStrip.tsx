import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { RegionId } from '@/constants/regions';
import { COMPOSE_HASHTAG_SUGGESTION_LIMIT } from '@/features/agenda/constants';
import { useAgendaHighlights } from '@/features/agenda/hooks/useAgendaHighlights';
import { hashtagPath } from '@/features/hashtag/navigation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedTrendingStripProps = {
  regionId: RegionId;
  karadenizWide?: boolean;
};

export function FeedTrendingStrip({ regionId, karadenizWide = false }: FeedTrendingStripProps) {
  const { colors } = useTheme();
  const { items } = useAgendaHighlights({
    regionId,
    karadenizWide,
    limit: COMPOSE_HASHTAG_SUGGESTION_LIMIT,
    includePopular: true,
  });

  if (items.length === 0) return null;

  const openTag = (tag: string) => {
    router.push(hashtagPath(tag));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.accent, { backgroundColor: colors.warning }]} />
          <Ionicons name="trending-up" size={16} color={colors.warning} />
          <Text variant="label">Gündem</Text>
        </View>
        <Pressable onPress={() => router.push('/agenda' as never)} style={styles.seeAll}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Tümü
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        {items.map((item) => {
          const isAgenda = item.kind === 'agenda';
          return (
          <Pressable
            key={item.tag}
            onPress={() => openTag(item.tag)}
            style={[
              styles.chip,
              {
                borderColor: isAgenda ? colors.primary : colors.warning,
                backgroundColor: isAgenda ? `${colors.primary}14` : `${colors.warning}14`,
              },
            ]}
          >
            {item.kind === 'trend' && item.rank ? (
              <Text variant="caption" style={{ color: colors.textMuted, fontWeight: '700', fontSize: 10 }}>
                {item.rank}
              </Text>
            ) : (
              <Ionicons
                name={isAgenda ? 'sunny-outline' : 'flame-outline'}
                size={12}
                color={isAgenda ? colors.primary : colors.warning}
              />
            )}
            <Text
              variant="caption"
              numberOfLines={1}
              style={{
                color: isAgenda ? colors.primary : colors.warning,
                fontWeight: '600',
                maxWidth: 120,
              }}
            >
              {item.label.startsWith('#') ? item.label : `#${item.label}`}
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
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  accent: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
