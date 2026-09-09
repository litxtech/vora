import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AuthHeader } from '@/components/auth/AuthHeader';
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
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
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

export function SoundLibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SoundListTabId>('recent');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const { results: searchResults, searching, hasQuery } = useSoundSearch(query);
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  useEffect(() => {
    invalidateSoundCache();
    return () => stopPreview();
  }, [stopPreview]);

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
    if (hasQuery) return;
    void loadSounds();
  }, [loadSounds, hasQuery]);

  const displaySounds = hasQuery ? searchResults : sounds;

  const handleUse = (sound: Sound) => {
    stopPreview();
    setMusicSelection(
      soundToMusicSelection({
        id: sound.id,
        title: sound.title,
        audioUrl: sound.audioUrl,
        durationSec: sound.durationSec,
        authorUsername: sound.author?.username,
      }),
    );
    router.push('/capture' as Href);
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
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <AuthHeader title="Ses Kütüphanesi" showBack />

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
            contentContainerStyle={{ paddingBottom: insets.bottom + 88, paddingHorizontal: spacing.md }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="musical-notes-outline" size={40} color={colors.textSecondary} />
                <Text secondary style={{ textAlign: 'center' }}>
                  {tab === 'mine'
                    ? 'Henüz ses oluşturmadınız. Mikrofonla kayıt yapın veya dosyadan yükleyin.'
                    : tab === 'recent'
                      ? 'Son kullandığınız sesler burada görünür.'
                      : 'Ses bulunamadı'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <SoundCard
                sound={item}
                playing={playingId === item.id}
                onPress={() => router.push(`/sounds/${item.id}` as Href)}
                onPreview={() => void togglePreview(item.id, item.audioUrl)}
                onUse={() => handleUse(item)}
              />
            )}
          />
        )}

        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + spacing.lg,
            },
          ]}
          onPress={() => router.push('/sounds/create' as Href)}
        >
          <Ionicons name="mic" size={22} color="#fff" />
          <Text variant="label" style={styles.fabText}>
            Ses Oluştur
          </Text>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  tabsRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
  },
});
