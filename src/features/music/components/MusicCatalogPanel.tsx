import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Text } from '@/components/ui/Text';
import { MusicFeaturedCarousel } from '@/features/music/components/MusicFeaturedCarousel';
import { MusicFilterChip } from '@/features/music/components/MusicFilterChip';
import { MusicPreviewBar } from '@/features/music/components/MusicPreviewBar';
import { MusicTrackRow } from '@/features/music/components/MusicTrackRow';
import { MUSIC_LIST_TABS, type MusicListTabId } from '@/features/music/constants';
import { useAudioCatalogSearch } from '@/features/music/hooks/useAudioCatalogSearch';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import {
  fetchAudioByCategory,
  fetchAudioByTab,
  fetchPopularAudio,
} from '@/features/music/services/audioCatalog';
import {
  fetchMusicCategories,
  fetchSavedMusicIds,
  toggleSavedMusic,
} from '@/features/music/services/musicData';
import { fetchSavedSoundIds, toggleSoundFavorite } from '@/features/sounds/services/soundData';
import type { AudioCatalogItem, MusicCategory } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_ICONS: Record<MusicListTabId, keyof typeof Ionicons.glyphMap> = {
  popular: 'flame-outline',
  recent: 'time-outline',
  saved: 'bookmark-outline',
  all: 'musical-notes-outline',
};

export type MusicCatalogPanelProps = {
  active?: boolean;
  contentBottomInset: number;
  selectedTrackId?: string | null;
  selectionMode?: boolean;
  tapToSelect?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  previewActionLabel?: string;
  ListHeaderComponent?: ReactElement | null;
  onBeforePreview?: () => void;
  onPickTrack: (item: AudioCatalogItem) => void;
  onOpenTrack?: (item: AudioCatalogItem) => void;
};

export function MusicCatalogPanel({
  active = true,
  contentBottomInset,
  selectedTrackId = null,
  selectionMode = false,
  tapToSelect = false,
  heroTitle = 'Müzik keşfet',
  heroSubtitle = 'Trend parçalar, sesler ve kaydettiklerin',
  previewActionLabel = 'Aç',
  ListHeaderComponent,
  onBeforePreview,
  onPickTrack,
  onOpenTrack,
}: MusicCatalogPanelProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<MusicListTabId>('popular');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [tracks, setTracks] = useState<AudioCatalogItem[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<AudioCatalogItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadGenRef = useRef(0);
  const { results: searchResults, searching, hasQuery } = useAudioCatalogSearch(query);
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  const loadMeta = useCallback(async () => {
    const [cats, savedMusic, savedSounds, popular] = await Promise.all([
      fetchMusicCategories(),
      user ? fetchSavedMusicIds(user.id) : Promise.resolve(new Set<string>()),
      user ? fetchSavedSoundIds(user.id) : Promise.resolve(new Set<string>()),
      fetchPopularAudio(10),
    ]);
    setCategories(cats);
    setSavedIds(new Set([...savedMusic, ...savedSounds]));
    setFeaturedTracks(popular);
  }, [user]);

  const loadTracks = useCallback(async () => {
    if (hasQuery) return;
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const items = categoryId
        ? await fetchAudioByCategory(categoryId, 48)
        : await fetchAudioByTab(tab, user?.id ?? null, 48);
      if (gen !== loadGenRef.current) return;
      setTracks(items);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [categoryId, hasQuery, tab, user?.id]);

  useEffect(() => {
    if (!active) {
      setQuery('');
      setCategoryId(null);
      setTab('popular');
      stopPreview();
      return;
    }
    void loadMeta();
  }, [active, loadMeta, stopPreview]);

  useEffect(() => {
    if (!active || hasQuery) return;
    void loadTracks();
  }, [active, hasQuery, loadTracks]);

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  const displayTracks = hasQuery ? searchResults : tracks;
  const previewTrack =
    displayTracks.find((item) => item.id === playingId) ??
    featuredTracks.find((item) => item.id === playingId) ??
    null;

  const sectionTitle = useMemo(() => {
    if (hasQuery) return 'Arama sonuçları';
    if (categoryId) return categories.find((c) => c.id === categoryId)?.label ?? 'Kategori';
    return MUSIC_LIST_TABS.find((t) => t.id === tab)?.label ?? 'Müzikler';
  }, [hasQuery, categoryId, categories, tab]);

  const emptyMessage = useMemo(() => {
    if (hasQuery) return 'Sonuç bulunamadı. Farklı bir anahtar kelime deneyin.';
    if (tab === 'recent') return 'Henüz müzik kullanmadınız.';
    if (tab === 'saved') return 'Henüz müzik kaydetmediniz.';
    return 'Henüz müzik veya ses eklenmemiş.';
  }, [hasQuery, tab]);

  const showFeatured = !hasQuery && tab === 'popular' && !categoryId && featuredTracks.length > 0;
  const listBottomPadding = contentBottomInset + (previewTrack ? 88 : 0) + spacing.md;

  const handlePreview = useCallback(
    async (item: AudioCatalogItem) => {
      onBeforePreview?.();
      const result = await togglePreview(item.id, item.audioUrl);
      if (!result.ok && result.error) Alert.alert('Önizleme', result.error);
    },
    [onBeforePreview, togglePreview],
  );

  const handleToggleSave = useCallback(
    async (track: AudioCatalogItem) => {
      if (!user) {
        Alert.alert('Giriş gerekli', 'Müzik kaydetmek için oturum açın.');
        return;
      }

      if (track.source === 'sound') {
        const { favorited, error } = await toggleSoundFavorite(track.id);
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (favorited) next.add(track.id);
          else next.delete(track.id);
          return next;
        });
        if (tab === 'saved' && !favorited && !hasQuery) {
          setTracks((prev) => prev.filter((item) => item.id !== track.id));
        }
        return;
      }

      const { saved, error } = await toggleSavedMusic(track.id);
      if (error) {
        Alert.alert('Hata', error);
        return;
      }
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(track.id);
        else next.delete(track.id);
        return next;
      });
      if (tab === 'saved' && !saved && !hasQuery) {
        setTracks((prev) => prev.filter((item) => item.id !== track.id));
      }
    },
    [hasQuery, tab, user],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMeta(), loadTracks()]);
    setRefreshing(false);
  }, [loadMeta, loadTracks]);

  const selectTab = (id: MusicListTabId) => {
    setTab(id);
    setCategoryId(null);
  };

  const pickTrack = useCallback(
    (item: AudioCatalogItem) => {
      stopPreview();
      onPickTrack(item);
    },
    [onPickTrack, stopPreview],
  );

  const openTrack = useCallback(
    (item: AudioCatalogItem) => {
      stopPreview();
      onOpenTrack?.(item);
    },
    [onOpenTrack, stopPreview],
  );

  const handleRowPress = useCallback(
    (item: AudioCatalogItem) => {
      if (selectionMode && tapToSelect) {
        pickTrack(item);
        return;
      }
      if (selectionMode) {
        void handlePreview(item);
        return;
      }
      if (onOpenTrack) {
        openTrack(item);
      }
    },
    [handlePreview, onOpenTrack, openTrack, pickTrack, selectionMode, tapToSelect],
  );

  const renderTrack = (item: AudioCatalogItem) => (
    <MusicTrackRow
      track={item}
      active={selectedTrackId === item.id}
      previewing={playingId === item.id}
      saved={savedIds.has(item.id)}
      showSourceBadge
      onPreview={() => void handlePreview(item)}
      onToggleSave={() => void handleToggleSave(item)}
      onUse={selectionMode ? () => pickTrack(item) : undefined}
      onPress={() => handleRowPress(item)}
    />
  );

  return (
    <View style={styles.root}>
      <FlatList
        style={styles.list}
        data={displayTracks}
        keyExtractor={(item) => `${item.source}:${item.id}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: listBottomPadding, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            {ListHeaderComponent}

            <View style={styles.hero}>
              <Text variant="label" style={styles.heroTitle}>
                {heroTitle}
              </Text>
              <Text variant="caption" secondary>
                {heroSubtitle}
              </Text>
            </View>

            <View
              style={[
                styles.searchWrap,
                {
                  backgroundColor: `${colors.textMuted}12`,
                  borderColor: `${colors.primary}22`,
                },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Parça, sanatçı veya ses ara…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : searching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>

            {!hasQuery ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScroll}
              >
                {MUSIC_LIST_TABS.map((item) => (
                  <MusicFilterChip
                    key={item.id}
                    label={item.label}
                    icon={TAB_ICONS[item.id]}
                    active={tab === item.id && !categoryId}
                    accent
                    onPress={() => selectTab(item.id)}
                  />
                ))}
                {categories.length > 0 ? (
                  <View style={[styles.filterDivider, { backgroundColor: `${colors.textMuted}25` }]} />
                ) : null}
                {categories.map((item) => (
                  <MusicFilterChip
                    key={item.id}
                    label={item.label}
                    active={categoryId === item.id}
                    onPress={() => setCategoryId((prev) => (prev === item.id ? null : item.id))}
                  />
                ))}
              </ScrollView>
            ) : null}

            {showFeatured ? (
              <MusicFeaturedCarousel
                items={featuredTracks.slice(0, 10)}
                playingId={playingId}
                onPress={(item) => {
                  if (selectionMode && tapToSelect) {
                    pickTrack(item);
                    return;
                  }
                  if (onOpenTrack) openTrack(item);
                }}
                onPreview={(item) => void handlePreview(item)}
              />
            ) : null}

            <View style={styles.listHeader}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
                {sectionTitle}
              </Text>
              {!loading && displayTracks.length > 0 ? (
                <Text variant="caption" secondary>
                  {displayTracks.length} parça
                </Text>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading && !hasQuery ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : searching ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name="musical-notes-outline" size={28} color={colors.primary} />
              </View>
              <Text variant="label">Henüz parça yok</Text>
              <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                {emptyMessage}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <View style={styles.row}>{renderTrack(item)}</View>}
      />

      {previewTrack ? (
        <MusicPreviewBar
          track={previewTrack}
          bottomInset={contentBottomInset}
          onTogglePreview={() => void handlePreview(previewTrack)}
          onOpen={() => pickTrack(previewTrack)}
          actionLabel={previewActionLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterScroll: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterDivider: {
    width: 1,
    height: 22,
    marginHorizontal: spacing.xs,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.md,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
