import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { loadContributionStats } from '@/features/vora-canlar/services/api';
import { useCloseModalOnRouteChange } from '@/hooks/useCloseModalOnRouteChange';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { REPORTER_LEVELS } from '@/features/profile/constants';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { fetchProfileById, fetchProfileByUsername } from '@/features/profile/services/profileData';
import type { PublicProfile } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const PLACEHOLDER_NAMES = new Set(['topluluk', 'üye', 'uye']);

export type CanlarUserTarget = {
  userId?: string | null;
  username?: string | null;
};

type Stats = {
  animals_supported: number | null;
  verified_rescues: number | null;
  donation_net_of_refunds_minor: number | null;
  in_kind_count: number | null;
  volunteer_count: number | null;
};

type CanlarUserSheetContextValue = {
  openUser: (target: CanlarUserTarget) => void;
};

const CanlarUserSheetContext = createContext<CanlarUserSheetContextValue | null>(null);

export function canOpenCanlarUser(userId?: string | null, username?: string | null) {
  if (userId) return true;
  const name = username?.replace(/^@/, '').trim().toLocaleLowerCase('tr-TR') ?? '';
  return name.length > 0 && !PLACEHOLDER_NAMES.has(name);
}

export function useCanlarUserSheetOptional() {
  return useContext(CanlarUserSheetContext);
}

export function CanlarUserSheetProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<CanlarUserTarget | null>(null);
  const openUser = useCallback((next: CanlarUserTarget) => {
    const username = next.username?.replace(/^@/, '').trim() || null;
    if (!canOpenCanlarUser(next.userId, username)) return;
    setTarget({ userId: next.userId ?? null, username });
  }, []);
  const value = useMemo(() => ({ openUser }), [openUser]);

  return (
    <CanlarUserSheetContext.Provider value={value}>
      {children}
      <CanlarOtherUserSheet target={target} onClose={() => setTarget(null)} />
    </CanlarUserSheetContext.Provider>
  );
}

function CanlarOtherUserSheet({ target, onClose }: { target: CanlarUserTarget | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const visible = target != null;
  const targetKey = `${target?.userId ?? ''}|${target?.username ?? ''}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    profile: PublicProfile | null;
    stats: Stats | null;
    loading: boolean;
    error: string | null;
  }>({ key: '', profile: null, stats: null, loading: false, error: null });
  if (snapshot.key !== targetKey) {
    setSnapshot({ key: targetKey, profile: null, stats: null, loading: Boolean(target), error: null });
  }
  const { profile, stats, loading, error } = snapshot.key === targetKey
    ? snapshot
    : { profile: null, stats: null, loading: Boolean(target), error: null };

  useCloseModalOnRouteChange(visible, onClose);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    void (async () => {
      if (target.userId) {
        const [loaded, result] = await Promise.all([
          fetchProfileById(target.userId),
          loadContributionStats(target.userId),
        ]);
        if (!alive) return;
        if (!loaded) {
          setSnapshot({ key: targetKey, profile: null, stats: null, loading: false, error: 'Profil bulunamadı.' });
          return;
        }
        setSnapshot({
          key: targetKey,
          profile: loaded,
          stats: result.data ? (result.data as unknown as Stats) : null,
          loading: false,
          error: result.error,
        });
        return;
      }
      const loaded = target.username ? await fetchProfileByUsername(target.username) : null;
      if (!alive) return;
      if (!loaded) {
        setSnapshot({ key: targetKey, profile: null, stats: null, loading: false, error: 'Profil bulunamadı.' });
        return;
      }
      const result = await loadContributionStats(loaded.id);
      if (!alive) return;
      setSnapshot({
        key: targetKey,
        profile: loaded,
        stats: result.data ? (result.data as unknown as Stats) : null,
        loading: false,
        error: result.error,
      });
    })();
    return () => {
      alive = false;
    };
  }, [target, targetKey]);

  const openAppProfile = () => {
    if (!profile) return;
    onClose();
    navigateToPublicProfile({
      userId: profile.id,
      businessId: profile.businessId,
      viewerId: user?.id ?? null,
    });
  };

  const tiles = [
    ['Desteklenen hayvan', stats?.animals_supported],
    ['Kurtarma', stats?.verified_rescues],
    ['Mama ve malzeme', stats?.in_kind_count],
    ['Gönüllülük', stats?.volunteer_count],
  ] as const;
  const level = REPORTER_LEVELS[profile?.reporterLevel ?? 1] ?? REPORTER_LEVELS[1];

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text style={styles.title}>{profile?.username ? `@${profile.username}` : 'Profil'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {loading && !profile ? <ActivityIndicator color={CANLAR_ACCENT} style={styles.loader} /> : null}
            {error && !profile ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            {profile ? (
              <View style={styles.body}>
                <Text style={styles.section}>Uygulama profili</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.identity}>
                    {profile.avatarUrl ? (
                      <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Ionicons name="person" size={28} color={CANLAR_ACCENT} />
                      </View>
                    )}
                    <View style={styles.identityCopy}>
                      <Text style={styles.name}>{profile.displayName || profile.username}</Text>
                      <Text secondary>@{profile.username}</Text>
                      {profile.regionName ? <Text secondary>{profile.regionName}</Text> : null}
                      <Text secondary>{level.label}</Text>
                    </View>
                  </View>
                  {profile.bio ? <Text numberOfLines={3}>{profile.bio}</Text> : null}
                </View>
                <View style={styles.tiles}>
                  <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.tileValue}>{profile.trustScore}</Text>
                    <Text secondary>Güven</Text>
                  </View>
                  <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.tileValue}>{profile.verifiedContentCount}</Text>
                    <Text secondary>Doğrulanan</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Uygulama profilini aç"
                  onPress={openAppProfile}
                  style={({ pressed }) => [styles.action, { opacity: pressed ? 0.86 : 1 }]}
                >
                  <Ionicons name="person-outline" size={16} color="#fff" />
                  <Text style={styles.actionLabel}>Profili aç</Text>
                </Pressable>

                <Text style={styles.section}>Vora Canlar</Text>
                {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
                <View style={styles.tiles}>
                  {tiles.map(([label, value]) => (
                    <View key={label} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.tileValue}>{stats == null ? '…' : value == null ? 'Gizli' : String(value)}</Text>
                      <Text secondary>{label}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text secondary>Bağış</Text>
                  <Text style={styles.tileValue}>
                    {stats == null
                      ? '…'
                      : stats.donation_net_of_refunds_minor == null
                        ? 'Gizli'
                        : formatMinor(stats.donation_net_of_refunds_minor)}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  loader: { marginVertical: spacing.lg },
  body: { gap: spacing.md },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  identity: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 22 },
  avatarFallback: { backgroundColor: `${CANLAR_ACCENT}22`, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '800' },
  section: { fontWeight: '800', fontSize: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: 4,
  },
  tileValue: { fontSize: 22, fontWeight: '800' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: CANLAR_ACCENT,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  actionLabel: { color: '#fff', fontWeight: '800' },
});
