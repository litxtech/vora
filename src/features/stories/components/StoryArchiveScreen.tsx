import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { StoryArchiveItemSheet } from '@/features/stories/components/StoryArchiveItemSheet';
import { useStoryArchive } from '@/features/stories/hooks/useStoryArchive';
import type { StoryArchiveItem } from '@/features/stories/types';
import {
  formatStoryArchiveSectionTitle,
  storyArchiveSectionKey,
} from '@/features/stories/utils/formatStoryArchiveDate';
import { STORY_ARCHIVE_ACCENT } from '@/features/stories/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const GRID_GAP = 3;

type ArchiveListEntry =
  | { type: 'header'; key: string; title: string }
  | { type: 'row'; key: string; items: StoryArchiveItem[] };

function buildArchiveEntries(items: StoryArchiveItem[]): ArchiveListEntry[] {
  const sections = new Map<string, { title: string; items: StoryArchiveItem[] }>();

  for (const item of items) {
    const key = storyArchiveSectionKey(item.createdAt);
    if (!sections.has(key)) {
      sections.set(key, {
        title: formatStoryArchiveSectionTitle(item.createdAt),
        items: [],
      });
    }
    sections.get(key)!.items.push(item);
  }

  const entries: ArchiveListEntry[] = [];
  for (const [, section] of sections) {
    entries.push({ type: 'header', key: `header-${section.title}`, title: section.title });
    for (let i = 0; i < section.items.length; i += 3) {
      const rowItems = section.items.slice(i, i + 3);
      entries.push({ type: 'row', key: `row-${rowItems[0]!.id}`, items: rowItems });
    }
  }

  return entries;
}

function formatDuration(sec: number | null): string | null {
  if (sec == null || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

export function StoryArchiveScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridGap = GRID_GAP;
  const cellSize = (width - spacing.lg * 2 - gridGap * 2) / 3;

  const { items, loading, loadingMore, refreshing, error, hasMore, refresh, loadMore } =
    useStoryArchive(true);

  const [selected, setSelected] = useState<StoryArchiveItem | null>(null);

  const entries = useMemo(() => buildArchiveEntries(items), [items]);

  const renderCell = useCallback(
    (item: StoryArchiveItem) => {
      const durationLabel = item.mediaType === 'video' ? formatDuration(item.durationSec) : null;

      return (
        <Pressable
          key={item.id}
          style={[styles.cell, { width: cellSize, height: cellSize * 1.45 }]}
          onPress={() => setSelected(item)}
        >
          <Image
            source={{ uri: item.thumbUrl ?? item.mediaUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.cellOverlay} />
          {item.mediaType === 'video' ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={12} color="#fff" />
              {durationLabel ? (
                <Text variant="caption" style={styles.durationText}>
                  {durationLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
          {item.isActive ? <View style={styles.liveDot} /> : null}
        </Pressable>
      );
    },
    [cellSize],
  );

  const renderEntry = useCallback(
    ({ item: entry }: { item: ArchiveListEntry }) => {
      if (entry.type === 'header') {
        return (
          <Text variant="label" style={styles.sectionTitle}>
            {entry.title}
          </Text>
        );
      }

      return (
        <View style={[styles.row, { gap: gridGap }]}>
          {entry.items.map(renderCell)}
          {entry.items.length < 3
            ? Array.from({ length: 3 - entry.items.length }).map((_, index) => (
                <View key={`pad-${index}`} style={{ width: cellSize }} />
              ))
            : null}
        </View>
      );
    },
    [cellSize, gridGap, renderCell],
  );

  return (
    <GradientBackground>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.key}
        renderItem={renderEntry}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={STORY_ARCHIVE_ACCENT}
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <AuthHeader
              title="Hikâye Arşivi"
              subtitle="Paylaştığınız hikâyeleri indirin veya yeniden paylaşın."
              showBack
              compact
            />
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={STORY_ARCHIVE_ACCENT} />
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="archive-outline" size={36} color={colors.textMuted} />
              <Text variant="body">Henüz arşivlenmiş hikâye yok</Text>
              <Text secondary variant="caption" style={styles.emptyHint}>
                {error ?? 'Paylaştığınız hikâyeler süresi dolduktan sonra burada görünür.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={STORY_ARCHIVE_ACCENT} />
            </View>
          ) : hasMore ? null : items.length > 0 ? (
            <Text secondary variant="caption" style={styles.footerEnd}>
              Tüm hikâyeler yüklendi
            </Text>
          ) : null
        }
      />

      <StoryArchiveItemSheet
        item={selected}
        visible={selected != null}
        onClose={() => setSelected(null)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    marginBottom: GRID_GAP,
  },
  cell: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyCard: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyHint: {
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  footerEnd: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
