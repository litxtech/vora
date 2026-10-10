import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { CapGridItem } from '@/features/caps/components/CapGridItem';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import {
  CAPS_CENTER_SUBTITLE,
  CAPS_CENTER_TABS,
  CAPS_CENTER_TITLE,
  CAPS_DISCOVER_SORTS,
  formatCapUsageCount,
} from '@/features/caps/constants';
import {
  addCapToLibrary,
  deleteOwnCap,
  fetchCapsCreatorLeaderboard,
  fetchDiscoverCaps,
  fetchLibraryCaps,
  fetchMyCreatedCaps,
  removeCapFromLibrary,
} from '@/features/caps/services/capsData';
import type {
  Cap,
  CapCreatorRank,
  CapsCenterTabId,
  CapsDiscoverSort,
} from '@/features/caps/types';
import { formatCount } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapsCenterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<CapsCenterTabId>('discover');
  const [sort, setSort] = useState<CapsDiscoverSort>('trending');
  const [caps, setCaps] = useState<Cap[]>([]);
  const [creators, setCreators] = useState<CapCreatorRank[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'creators') {
        setCreators(await fetchCapsCreatorLeaderboard(50));
        setCaps([]);
        return;
      }

      let rows: Cap[] = [];
      if (tab === 'discover') {
        rows = await fetchDiscoverCaps(sort, 80);
        if (user) {
          const lib = await fetchLibraryCaps(user.id);
          const libIds = new Set(lib.map((c) => c.id));
          rows = rows.map((c) => ({ ...c, inLibrary: libIds.has(c.id) }));
        }
      } else if (tab === 'library') {
        rows = user ? await fetchLibraryCaps(user.id) : [];
      } else {
        rows = user ? await fetchMyCreatedCaps(user.id) : [];
      }
      setCaps(rows);
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [tab, sort, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openCreate = () => {
    if (!user) {
      Alert.alert('Giriş gerekli', 'Caps üretmek için giriş yapın.');
      return;
    }
    router.push('/caps/create' as Href);
  };

  const handleCapPress = (cap: Cap) => {
    if (tab === 'discover' && user && !cap.inLibrary && cap.creatorId !== user.id) {
      Alert.alert('Kütüphaneye ekle', `@${cap.creator?.username ?? 'kullanici'} caps’ini ekle?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async () => {
            const { error } = await addCapToLibrary(cap.id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Eklendi', 'Caps kütüphanenize kaydedildi.');
              void load();
            }
          },
        },
        {
          text: 'Detay',
          onPress: () => router.push(`/caps/${cap.id}` as Href),
        },
      ]);
      return;
    }
    router.push(`/caps/${cap.id}` as Href);
  };

  const handleCapLongPress = (cap: Cap) => {
    if (!user) return;

    const isOwner = cap.librarySource === 'created' || cap.creatorId === user.id;
    if (isOwner) {
      Alert.alert('Caps', undefined, [
        {
          text: 'Detay',
          onPress: () => router.push(`/caps/${cap.id}` as Href),
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Caps silinsin mi?', 'Keşif ve kütüphanelerden kaldırılır.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await deleteOwnCap(cap.id);
                  if (error) Alert.alert('Hata', error);
                  else void load();
                },
              },
            ]);
          },
        },
        { text: 'İptal', style: 'cancel' },
      ]);
      return;
    }

    if (tab === 'library') {
      Alert.alert('Kütüphaneden kaldır', 'Bu caps kütüphanenizden çıkarılsın mı?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeCapFromLibrary(cap.id);
            if (error) Alert.alert('Hata', error);
            else void load();
          },
        },
      ]);
    }
  };

  const emptyMessage = (() => {
    if (tab === 'discover') return 'Henüz keşfedilecek caps yok. İlk sen üret.';
    if (tab === 'library') return 'Kütüphanen boş. Keşfet’ten ekle veya kendin üret.';
    if (tab === 'mine') return 'Henüz caps üretmediniz.';
    return 'Henüz sıralanacak üretici yok.';
  })();

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <AuthHeader title={CAPS_CENTER_TITLE} />
        <Text secondary style={styles.subtitle}>
          {CAPS_CENTER_SUBTITLE}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={openCreate}
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text variant="caption" style={styles.createText}>
              Caps Studio
            </Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {CAPS_CENTER_TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={active ? '#fff' : colors.primary}
                />
                <Text
                  variant="caption"
                  style={{
                    color: active ? '#fff' : colors.primary,
                    fontWeight: '600',
                    fontSize: 11,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'discover' ? (
          <View style={styles.sortRow}>
            {CAPS_DISCOVER_SORTS.map((item) => {
              const active = sort === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSort(item.id)}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: active ? `${colors.primary}22` : colors.surfaceElevated,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? colors.primary : colors.textSecondary,
                      fontWeight: '600',
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {tab === 'mine' || tab === 'library' ? (
          <Text secondary style={styles.hint}>
            Uzun basarak {tab === 'mine' ? 'sil' : 'kaldır'}abilirsin.
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : tab === 'creators' ? (
          <FlatList
            key="caps-creators"
            data={creators}
            keyExtractor={(item) => item.creatorId}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                {emptyMessage}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.creatorRow, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => router.push(`/user/${item.creatorId}` as Href)}
              >
                <Text style={[styles.rank, { color: colors.primary }]}>#{item.rank}</Text>
                <ProfileAvatar
                  username={item.username}
                  avatarUrl={item.avatarUrl}
                  size={44}
                />
                <View style={styles.creatorBody}>
                  <Text style={{ fontWeight: '700' }}>@{item.username}</Text>
                  <Text secondary variant="caption">
                    {item.capsCount} caps · {formatCapUsageCount(item.totalUniqueUsers)}
                  </Text>
                </View>
                <View style={styles.creatorStats}>
                  <Text variant="label">{formatCount(item.totalUniqueUsers)}</Text>
                  <Text secondary variant="caption">
                    kullanım
                  </Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            key="caps-grid"
            data={caps}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
            columnWrapperStyle={styles.row}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                {emptyMessage}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <CapGridItem
                  cap={item}
                  onPress={handleCapPress}
                  onLongPress={
                    tab === 'library' || tab === 'mine' ? handleCapLongPress : undefined
                  }
                  showCreator
                  showUsage
                />
              </View>
            )}
          />
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subtitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
  },
  createText: { color: '#fff', fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  row: { gap: spacing.sm },
  cell: { flex: 1 / 3 },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  rank: {
    width: 36,
    fontWeight: '800',
    fontSize: 15,
  },
  creatorBody: { flex: 1, gap: 2 },
  creatorStats: { alignItems: 'flex-end' },
});
