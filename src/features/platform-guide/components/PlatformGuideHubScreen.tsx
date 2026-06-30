import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { PlatformGuideCard } from '@/features/platform-guide/components/PlatformGuideCard';
import {
  PLATFORM_GUIDE_CATEGORY_META,
  PLATFORM_GUIDE_HUB_INTRO,
  platformGuideDetailPath,
} from '@/features/platform-guide/constants';
import { fetchPlatformGuides } from '@/features/platform-guide/services/platformGuideData';
import type { PlatformGuideCategory, PlatformGuideListItem } from '@/features/platform-guide/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FilterId = 'all' | PlatformGuideCategory;

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  ...Object.entries(PLATFORM_GUIDE_CATEGORY_META).map(([id, meta]) => ({
    id: id as FilterId,
    label: meta.label,
  })),
];

export function PlatformGuideHubScreen() {
  const { colors } = useTheme();
  const [guides, setGuides] = useState<PlatformGuideListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchPlatformGuides();
    setGuides(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return guides;
    return guides.filter((guide) => guide.category === filter);
  }, [filter, guides]);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Platform Rehberi" subtitle="Kısa ve net anlatımlar" showBack />

        <GlassCard style={styles.intro}>
          <Text secondary variant="body" style={styles.introText}>
            {PLATFORM_GUIDE_HUB_INTRO}
          </Text>
        </GlassCard>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.id;
            const accent =
              option.id === 'all'
                ? colors.primary
                : PLATFORM_GUIDE_CATEGORY_META[option.id as PlatformGuideCategory]?.accent ??
                  colors.primary;
            return (
              <Text
                key={option.id}
                variant="caption"
                onPress={() => setFilter(option.id)}
                style={[
                  styles.filterChip,
                  {
                    color: active ? accent : colors.textSecondary,
                    borderColor: active ? accent : colors.border,
                    backgroundColor: active ? `${accent}18` : 'transparent',
                  },
                ]}
              >
                {option.label}
              </Text>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {loading ? (
            <GlassCard>
              <Text secondary variant="caption">
                Rehberler yükleniyor…
              </Text>
            </GlassCard>
          ) : filtered.length === 0 ? (
            <GlassCard>
              <Text variant="label">Henüz rehber yok</Text>
              <Text secondary variant="caption">
                Yeni içerikler yayınlandığında burada görünecek.
              </Text>
            </GlassCard>
          ) : (
            filtered.map((guide) => (
              <PlatformGuideCard
                key={guide.id}
                guide={guide}
                onPress={() => router.push(platformGuideDetailPath(guide.slug) as Href)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  intro: { gap: spacing.xs },
  introText: { lineHeight: 22 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  list: { gap: spacing.sm },
});
