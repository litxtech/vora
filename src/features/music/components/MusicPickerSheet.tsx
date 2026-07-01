import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MusicFilterChip } from '@/features/music/components/MusicFilterChip';
import { MusicTrackRow } from '@/features/music/components/MusicTrackRow';
import { isMusicTrackPlayable, MUSIC_LIST_TABS, type MusicListTabId } from '@/features/music/constants';
import { isPersistableMusicTrackId } from '@/features/music/utils/trackId';
import { invalidateMusicCache } from '@/features/music/services/musicCache';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import { useMusicSearch } from '@/features/music/hooks/useMusicSearch';
import {
  fetchFeaturedMusic,
  fetchMusicByCategory,
  fetchMusicCategories,
  fetchNewMusic,
  fetchRecentMusic,
  fetchTrendingMusic,
} from '@/features/music/services/musicData';
import type { MusicCategory, MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const TAB_ICONS: Record<MusicListTabId, keyof typeof Ionicons.glyphMap> = {
  featured: 'star-outline',
  recent: 'time-outline',
  trending: 'flame-outline',
  new: 'sparkles-outline',
};

type MusicPickerSheetProps = {
  visible: boolean;
  selectedTrackId: string | null;
  onClose: () => void;
  onSelect: (track: MusicTrack) => void;
  /** Video önizlemesini duraklat — ses oturumu çakışmasını önler */
  pauseVideo?: () => void;
  alternateModeLabel?: string;
  onAlternateMode?: () => void;
};

export function MusicPickerSheet({
  visible,
  selectedTrackId,
  onClose,
  onSelect,
  pauseVideo,
  alternateModeLabel,
  onAlternateMode,
}: MusicPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<MusicListTabId>('new');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const { results: searchResults, searching, hasQuery } = useMusicSearch(query);
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  useEffect(() => {
    if (!visible) return;
    invalidateMusicCache();
    void fetchMusicCategories().then(setCategories);
  }, [visible]);

  const loadTracks = useCallback(async () => {
    if (hasQuery) return;
    setLoading(true);
    try {
      if (categoryId) {
        setTracks(await fetchMusicByCategory(categoryId));
        return;
      }

      switch (tab) {
        case 'recent':
          setTracks(user ? await fetchRecentMusic(user.id) : []);
          break;
        case 'trending':
          setTracks(await fetchTrendingMusic('7d'));
          break;
        case 'new':
          setTracks(await fetchNewMusic());
          break;
        default:
          setTracks(await fetchFeaturedMusic());
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId, hasQuery, tab, user]);

  useEffect(() => {
    if (!visible || hasQuery) return;
    void loadTracks();
  }, [visible, loadTracks, hasQuery]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCategoryId(null);
      setTab('new');
      stopPreview();
      return;
    }
    pauseVideo?.();
  }, [visible, stopPreview, pauseVideo]);

  const displayTracks = hasQuery ? searchResults : tracks;
  const previewTrack = displayTracks.find((item) => item.id === playingId) ?? null;

  const handleListen = async (track: MusicTrack) => {
    pauseVideo?.();
    const result = await togglePreview(track.id, track.audioUrl);
    if (!result.ok && result.error) {
      Alert.alert('Önizleme', result.error);
    }
  };

  const handleAddTrack = (track: MusicTrack) => {
    if (!isMusicTrackPlayable(track.audioUrl)) {
      Alert.alert('Ses dosyası yok', 'Bu parçanın sesi henüz yüklenmemiş.');
      return;
    }
    if (!isPersistableMusicTrackId(track.id)) {
      Alert.alert(
        'Demo parça',
        'Bu parça yalnızca önizleme içindir. Paylaşım için listeden lisanslı bir parça seçin.',
      );
      return;
    }
    stopPreview();
    onSelect(track);
    onClose();
  };

  const handleClose = useCallback(() => {
    if (playingId) {
      Alert.alert(
        'Müzik seçilmedi',
        'Dinlediğiniz parçayı videoya eklemek için alttaki "Videoya ekle" veya satırdaki "Ekle"ye dokunun.',
        [
          { text: 'Dinlemeye devam', style: 'cancel' },
          {
            text: 'Kapat',
            style: 'destructive',
            onPress: () => {
              stopPreview();
              onClose();
            },
          },
        ],
      );
      return;
    }
    stopPreview();
    onClose();
  }, [onClose, playingId, stopPreview]);

  const sectionTitle = useMemo(() => {
    if (hasQuery) return 'Arama sonuçları';
    if (categoryId) {
      return categories.find((c) => c.id === categoryId)?.label ?? 'Kategori';
    }
    return MUSIC_LIST_TABS.find((t) => t.id === tab)?.label ?? 'Müzikler';
  }, [hasQuery, categoryId, categories, tab]);

  const selectTab = (id: MusicListTabId) => {
    setTab(id);
    setCategoryId(null);
  };

  const selectCategory = (id: string) => {
    setCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={22} color={colors.text} />
          </Pressable>
          <Text variant="label" style={styles.headerTitle}>
            Müzik ekle
          </Text>
          {alternateModeLabel && onAlternateMode ? (
            <Pressable onPress={onAlternateMode} hitSlop={12} style={styles.iconBtn}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {alternateModeLabel}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <View style={[styles.searchWrap, { backgroundColor: `${colors.textMuted}12` }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Şarkı, sanatçı, albüm..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
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
            <View style={[styles.filterDivider, { backgroundColor: `${colors.textMuted}25` }]} />
            {categories.map((item) => (
              <MusicFilterChip
                key={item.id}
                label={item.label}
                active={categoryId === item.id}
                onPress={() => selectCategory(item.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.listHeader}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
            {sectionTitle}
          </Text>
          {!loading && displayTracks.length > 0 ? (
            <Text variant="caption" secondary>
              {displayTracks.length} parça
            </Text>
          ) : null}
        </View>

        <View style={styles.listHint}>
          <Ionicons name="headset-outline" size={14} color={colors.primary} />
          <Text secondary variant="caption" style={{ flex: 1 }}>
            Dinle ile önizle · Ekle ile seç · Studio&apos;da üstteki İzle ile kontrol et
          </Text>
        </View>

        {loading && !hasQuery ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={displayTracks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: (previewTrack ? 88 : 0) + insets.bottom + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: `${colors.border}80` }]} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="musical-notes-outline" size={32} color={colors.textMuted} />
                <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                  {hasQuery ? 'Sonuç bulunamadı.' : 'Henüz müzik eklenmemiş.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MusicTrackRow
                track={item}
                active={selectedTrackId === item.id}
                previewing={playingId === item.id}
                onListen={() => void handleListen(item)}
                onAdd={() => handleAddTrack(item)}
              />
            )}
          />
        )}

        {previewTrack ? (
          <View
            style={[
              styles.previewBar,
              {
                backgroundColor: colors.surfaceElevated,
                borderTopColor: `${colors.primary}44`,
                paddingBottom: insets.bottom + spacing.sm,
              },
            ]}
          >
            <Pressable
              style={[styles.previewPlayBtn, { backgroundColor: colors.primary }]}
              onPress={() => void handleListen(previewTrack)}
            >
              <Ionicons name="pause" size={18} color="#fff" />
            </Pressable>
            <View style={styles.previewMeta}>
              <Text variant="label" numberOfLines={1}>
                {previewTrack.displayTitle}
              </Text>
              <Text secondary variant="caption" numberOfLines={1}>
                {previewTrack.artist || 'Bilinmeyen sanatçı'} · Şimdi dinleniyor
              </Text>
            </View>
            <Pressable
              style={[styles.previewAdd, { backgroundColor: colors.accent }]}
              onPress={() => handleAddTrack(previewTrack)}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
                Videoya ekle
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filterScroll: { flexGrow: 0, maxHeight: 44 },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: 6,
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  listHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  previewBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  previewPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  previewAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: radius.full,
  },
});
