import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IzdivacParticipantCard } from '@/features/izdivac/components/IzdivacParticipantCard';
import { IzdivacTabBar } from '@/features/izdivac/components/IzdivacTabBar';
import { IZDIVAC_GENDER_TAB_OPTIONS } from '@/features/izdivac/constants';
import type { IzdivacLobbySnapshot } from '@/features/izdivac/hooks/useIzdivacLobby';
import type { IzdivacGenderTab, IzdivacParticipant } from '@/features/izdivac/types';
import { izdivacParticipantToFeedAuthor } from '@/features/izdivac/utils';
import { fetchProfileById } from '@/features/profile/services/profileData';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUserCard } from '@/providers/UserCardProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

function defaultGenderTab(gender: string | null | undefined): IzdivacGenderTab {
  if (gender === 'female') return 'men';
  return 'women';
}

export function IzdivacMembersTab({ lobby }: { lobby: IzdivacLobbySnapshot }) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { openUserCard } = useUserCard();
  const { lobby: lobbyState, loading, error, refresh, canJoin, lobbyBlockReason } = lobby;
  const [genderTab, setGenderTab] = useState<IzdivacGenderTab>(() => defaultGenderTab(profile?.gender));

  const handleOpenProfile = useCallback(
    (participant: IzdivacParticipant) => {
      void (async () => {
        const publicProfile = await fetchProfileById(participant.userId);
        openUserCard(izdivacParticipantToFeedAuthor(participant, publicProfile));
      })();
    },
    [openUserCard],
  );

  const tabMeta = IZDIVAC_GENDER_TAB_OPTIONS.find((t) => t.id === genderTab) ?? IZDIVAC_GENDER_TAB_OPTIONS[0];
  const participants = useMemo(
    () => (genderTab === 'women' ? lobbyState.women : lobbyState.men),
    [genderTab, lobbyState.men, lobbyState.women],
  );

  const listPerf = getAndroidFlatListPerfProps();

  return (
    <View style={styles.wrap}>
      <IzdivacTabBar
        value={genderTab}
        onChange={setGenderTab}
        womenCount={lobbyState.women.length}
        menCount={lobbyState.men.length}
      />

      {!canJoin && lobbyBlockReason ? (
        <View style={[styles.warnBanner, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}35` }]}>
          <Text variant="caption" style={{ color: colors.warning, fontSize: 11 }}>
            {lobbyBlockReason}
          </Text>
          {lobbyBlockReason.includes('profil') ? (
            <Pressable onPress={() => router.push('/profile/edit' as never)}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                Profili düzenle
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading && participants.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={tabMeta.accent} size="small" />
          <Text secondary variant="caption" style={styles.loadingText}>
            Üyeler yükleniyor…
          </Text>
        </View>
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.userId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          {...listPerf}
          ListEmptyComponent={
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Ionicons name={tabMeta.icon as keyof typeof Ionicons.glyphMap} size={28} color={colors.textMuted} />
              <Text secondary variant="caption" style={styles.emptyText}>
                {genderTab === 'women' ? 'Henüz kadın üye yok' : 'Henüz erkek üye yok'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardSlot}>
              <IzdivacParticipantCard
                participant={item}
                accent={tabMeta.accent}
                onOpenProfile={handleOpenProfile}
              />
            </View>
          )}
        />
      )}

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}>
          <Text variant="caption" style={{ color: colors.danger, fontSize: 11 }}>
            {error}
          </Text>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.sm },
  warnBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: { fontSize: 11 },
  listContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
    gap: spacing.sm,
  },
  row: { gap: spacing.sm },
  cardSlot: { flex: 1, minWidth: 0 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  emptyText: { textAlign: 'center', fontWeight: '600' },
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
