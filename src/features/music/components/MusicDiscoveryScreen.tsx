import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { MusicUsageCreatorStrip } from '@/features/music/components/MusicUsageCreatorStrip';
import { MusicUsagePreviewGrid } from '@/features/music/components/MusicUsagePreviewGrid';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import { fetchMusicTrackDiscovery } from '@/features/music/services/musicData';
import type { MusicTrack, MusicUsageContentPreview, MusicUsageCreatorPreview } from '@/features/music/types';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function MusicDiscoveryScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const trackId = Array.isArray(id) ? id[0] : id;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [creators, setCreators] = useState<MusicUsageCreatorPreview[]>([]);
  const [items, setItems] = useState<MusicUsageContentPreview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDiscovery = useCallback(
    async (cursor: string | null = null, append = false) => {
      if (!trackId) return;

      const result = await fetchMusicTrackDiscovery(trackId, 24, cursor);

      setTrack(result.track);
      setNextCursor(result.nextCursor);

      if (append) {
        setItems((prev) => {
          const seen = new Set(prev.map((item) => `${item.kind}-${item.id}`));
          const merged = [...prev];
          for (const item of result.items) {
            const key = `${item.kind}-${item.id}`;
            if (!seen.has(key)) merged.push(item);
          }
          return merged;
        });
        setCreators((prev) => {
          const map = new Map(prev.map((entry) => [entry.author.id, entry]));
          for (const entry of result.creators) {
            const existing = map.get(entry.author.id);
            if (!existing) {
              map.set(entry.author.id, entry);
            } else {
              existing.usageCount += entry.usageCount;
              if (entry.latestAt > existing.latestAt) existing.latestAt = entry.latestAt;
            }
          }
          return [...map.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
        });
      } else {
        setItems(result.items);
        setCreators(result.creators);
      }
    },
    [trackId],
  );

  useEffect(() => {
    if (!trackId) return;
    setLoading(true);
    void loadDiscovery().finally(() => setLoading(false));
    return () => stopPreview();
  }, [trackId, loadDiscovery, stopPreview]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiscovery();
    setRefreshing(false);
  }, [loadDiscovery]);

  const onLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadDiscovery(nextCursor, true);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, loadDiscovery]);

  const isPlaying = Boolean(track && playingId === track.id);

  const onToggleTrackPreview = () => {
    if (!track) return;
    void togglePreview(track.id, track.audioUrl);
  };

  return (
    <GradientBackground>
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <ScreenBackButton style={styles.iconBtn} />
          <Text variant="label" style={styles.headerTitle}>
            Müzik
          </Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 120) {
                void onLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {track ? (
              <View style={[styles.hero, { backgroundColor: `${colors.textMuted}10` }]}>
                {track.coverUrl ? (
                  <Image source={{ uri: track.coverUrl }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${colors.accent}18` }]}>
                    <Ionicons name="musical-notes" size={28} color={colors.accent} />
                  </View>
                )}

                <View style={styles.heroMeta}>
                  <Text variant="label" numberOfLines={2}>
                    {track.displayTitle}
                  </Text>
                  <Text secondary variant="caption" numberOfLines={1}>
                    {track.artist}
                    {track.durationSec > 0 ? ` · ${formatMusicDuration(track.durationSec)}` : ''}
                  </Text>
                  <Text secondary variant="caption" style={{ marginTop: 2 }}>
                    {track.usageCount} kullanım · {items.length} önizleme
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.playBtn,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={onToggleTrackPreview}
                  >
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color="#fff" />
                    <Text variant="caption" style={styles.playBtnLabel}>
                      {isPlaying ? 'Durdur' : 'Dinle'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <MusicUsageCreatorStrip creators={creators} />

            <Text variant="label" style={styles.sectionTitle}>
              Gönderiler ve reels
            </Text>

            <MusicUsagePreviewGrid items={items} />

            {loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : null}

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    flex: 1,
    gap: 2,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  playBtnLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
