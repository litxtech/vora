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
import { router, type Href } from 'expo-router';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { SoundCard } from '@/features/sounds/components/SoundCard';
import { SOUND_LIST_TABS } from '@/features/sounds/constants';
import type { SoundListTabId } from '@/features/sounds/types';
import { useSoundSearch } from '@/features/sounds/hooks/useSoundSearch';
import { invalidateSoundCache } from '@/features/sounds/services/soundCache';
import {
  fetchFollowingSounds,
  fetchMySounds,
  fetchNewSounds,
  fetchRecentSounds,
  fetchSavedSounds,
  fetchTrendingSounds,
} from '@/features/sounds/services/soundData';
import { soundToMusicSelection } from '@/features/sounds/services/recordSoundUsage';
import type { Sound } from '@/features/sounds/types';
import type { MusicSelection } from '@/features/music/types';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const TAB_ICONS: Record<SoundListTabId, keyof typeof Ionicons.glyphMap> = {
  recent: 'time-outline',
  trending: 'flame-outline',
  new: 'sparkles-outline',
  following: 'people-outline',
  saved: 'bookmark-outline',
  mine: 'person-outline',
};

type SoundPickerSheetProps = {
  visible: boolean;
  selectedSoundId?: string | null;
  onClose: () => void;
  onSelect: (selection: MusicSelection) => void;
  pauseVideo?: () => void;
  alternateModeLabel?: string;
  onAlternateMode?: () => void;
  selectionMode?: boolean;
};

export function SoundPickerSheet({
  visible,
  selectedSoundId,
  onClose,
  onSelect,
  pauseVideo,
  alternateModeLabel,
  onAlternateMode,
  selectionMode = false,
}: SoundPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SoundListTabId>('recent');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(false);
  const { results: searchResults, searching, hasQuery } = useSoundSearch(query);
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  useEffect(() => {
    if (!visible) return;
    invalidateSoundCache();
  }, [visible]);

  const loadSounds = useCallback(async () => {
    if (hasQuery) return;
    setLoading(true);
    try {
      switch (tab) {
        case 'recent':
          setSounds(user ? await fetchRecentSounds(user.id) : []);
          break;
        case 'new':
          setSounds(await fetchNewSounds());
          break;
        case 'following':
          setSounds(user ? await fetchFollowingSounds() : []);
          break;
        case 'saved':
          setSounds(user ? await fetchSavedSounds(user.id) : []);
          break;
        case 'mine':
          setSounds(user ? await fetchMySounds(user.id) : []);
          break;
        default:
          setSounds(await fetchTrendingSounds());
      }
    } finally {
      setLoading(false);
    }
  }, [hasQuery, tab, user]);

  useEffect(() => {
    if (!visible || hasQuery) return;
    void loadSounds();
  }, [visible, loadSounds, hasQuery]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setTab('recent');
      stopPreview();
      return;
    }
    pauseVideo?.();
  }, [visible, stopPreview, pauseVideo]);

  const displaySounds = hasQuery ? searchResults : sounds;

  const handlePreview = async (sound: Sound) => {
    pauseVideo?.();
    const result = await togglePreview(sound.id, sound.audioUrl);
    if (!result.ok && result.error) Alert.alert('Önizleme', result.error);
  };

  const handleUse = (sound: Sound) => {
    stopPreview();
    onSelect(
      soundToMusicSelection({
        id: sound.id,
        title: sound.title,
        audioUrl: sound.audioUrl,
        durationSec: sound.durationSec,
        authorUsername: sound.author?.username,
      }),
    );
    onClose();
  };

  const handleClose = useCallback(() => {
    stopPreview();
    onClose();
  }, [onClose, stopPreview]);

  const openLibrary = () => {
    stopPreview();
    onClose();
    router.push('/sounds' as Href);
  };

  const openCreate = () => {
    stopPreview();
    onClose();
    router.push('/sounds/create' as Href);
  };

  const tabButtons = useMemo(
    () =>
      SOUND_LIST_TABS.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[
              styles.tabChip,
              {
                backgroundColor: active ? `${colors.accent}22` : colors.surface,
                borderColor: active ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons name={TAB_ICONS[item.id]} size={14} color={active ? colors.accent : colors.textSecondary} />
            <Text variant="caption" style={{ color: active ? colors.accent : colors.textSecondary }}>
              {item.label}
            </Text>
          </Pressable>
        );
      }),
    [colors.accent, colors.border, colors.surface, colors.textSecondary, tab],
  );

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={handleClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <Text variant="title">Ses Seç</Text>
            <View style={styles.headerActions}>
              {alternateModeLabel && onAlternateMode ? (
                <Pressable onPress={onAlternateMode} hitSlop={12} style={styles.altModeBtn}>
                  <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                    {alternateModeLabel}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {!selectionMode ? (
            <View style={styles.quickLinks}>
              <Pressable
                style={[styles.quickLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={openLibrary}
              >
                <Ionicons name="library-outline" size={16} color={colors.accent} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Kütüphane
                </Text>
              </Pressable>
              <Pressable
                style={[styles.quickLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={openCreate}
              >
                <Ionicons name="mic-outline" size={16} color={colors.primary} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Ses Oluştur
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ses, kullanıcı veya etiket ara"
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          {!hasQuery ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {tabButtons}
            </ScrollView>
          ) : null}

          {loading || searching ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={displaySounds}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="musical-notes-outline" size={40} color={colors.textSecondary} />
                  <Text secondary>
                    {tab === 'recent'
                      ? 'Henüz ses kullanmadınız. Trend seslere göz atın veya kendi sesinizi oluşturun.'
                      : 'Ses bulunamadı'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <SoundCard
                  sound={item}
                  playing={playingId === item.id}
                  selected={selectedSoundId === item.id}
                  onPress={() => {
                    if (selectionMode) {
                      void handlePreview(item);
                      return;
                    }
                    stopPreview();
                    onClose();
                    router.push(`/sounds/${item.id}` as Href);
                  }}
                  onPreview={() => void handlePreview(item)}
                  onUse={() => handleUse(item)}
                />
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  altModeBtn: {
    paddingHorizontal: spacing.xs,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  tabsRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
