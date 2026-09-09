import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { DateAccessGate } from '@/features/date/components/DateAccessGate';
import { DateCard } from '@/features/date/components/DateCard';
import { DateJoinRequestSheet } from '@/features/date/components/DateJoinRequestSheet';
import { DATE_ACCENT } from '@/features/date/constants';
import type { DateJoinRequest, DateOuting } from '@/features/date/types';
import {
  cancelDateOuting,
  ensureDateConversation,
  fetchDateOutingById,
} from '@/features/date/services/dateData';
import {
  fetchPendingRequestsForOuting,
  respondDateJoinRequest,
  withdrawDateJoinRequest,
} from '@/features/date/services/dateJoinData';
import { genderLabelTr } from '@/features/date/utils';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type DateDetailScreenProps = {
  outingId: string;
};

function ProfileChip({
  username,
  fullName,
  avatarUrl,
  gender,
  onPress,
}: {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  gender: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.profileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <ProfileTabIcon avatarUrl={avatarUrl} username={username} color={DATE_ACCENT} size={44} />
      <View style={styles.profileCopy}>
        <Text variant="label" numberOfLines={1}>
          {fullName ?? username}
        </Text>
        <Text secondary variant="caption">
          {genderLabelTr(gender)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export function DateDetailScreen({ outingId }: DateDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [outing, setOuting] = useState<DateOuting | null>(null);
  const [pending, setPending] = useState<DateJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDateOutingById(outingId, user?.id ?? null);
    setOuting(data);
    if (data && user?.id === data.creatorId) {
      setPending(await fetchPendingRequestsForOuting(outingId));
    } else {
      setPending([]);
    }
    setLoading(false);
  }, [outingId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isCreator = user?.id === outing?.creatorId;

  const openChat = async () => {
    if (!outing) return;
    setActing(true);
    const { conversationId, error } = await ensureDateConversation(outing.id);
    setActing(false);
    if (error || !conversationId) {
      Alert.alert('Sohbet açılamadı', error ?? 'Bilinmeyen hata');
      return;
    }
    router.push(`/chat/${conversationId}`);
  };

  const handleCancel = () => {
    Alert.alert('Date iptal', 'Bu date iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelDateOuting(outingId);
          if (error) {
            Alert.alert('İptal edilemedi', error);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  const handleWithdraw = async () => {
    if (!outing?.myPendingRequestId) return;
    const { error } = await withdrawDateJoinRequest(outing.myPendingRequestId);
    if (error) {
      Alert.alert('Geri çekilemedi', error);
      return;
    }
    void load();
  };

  if (loading) {
    return <DetailLoadingShell />;
  }

  if (!outing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text secondary>Date bulunamadı</Text>
      </View>
    );
  }

  const canJoin =
    outing.status === 'open' &&
    !outing.isOrganizer &&
    !outing.isApprovedMember &&
    !outing.myPendingRequestId;

  const canChat = outing.isOrganizer || outing.isApprovedMember;

  return (
    <DateAccessGate>
      <GradientBackground style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <ScreenBackButton />
          <Text variant="h2" style={styles.headerTitle} numberOfLines={1}>
            Date detay
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <DateCard outing={outing} onPress={() => {}} showJoinAction={false} />

          {outing.description ? (
            <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="label">Açıklama</Text>
              <Text secondary variant="body" style={styles.bodyText}>
                {outing.description}
              </Text>
            </View>
          ) : null}

          <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="label">Organizatör grubu</Text>
            {outing.organizers.map((p) => (
              <ProfileChip
                key={p.userId}
                username={p.username}
                fullName={p.fullName}
                avatarUrl={p.avatarUrl}
                gender={p.gender}
                onPress={() => router.push(`/user/${p.userId}`)}
              />
            ))}
          </View>

          {outing.approvedMembers.length > 0 ? (
            <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="label">Katılanlar</Text>
              {outing.approvedMembers.map((p) => (
                <ProfileChip
                  key={p.userId}
                  username={p.username}
                  fullName={p.fullName}
                  avatarUrl={p.avatarUrl}
                  gender={p.gender}
                  onPress={() => router.push(`/user/${p.userId}`)}
                />
              ))}
            </View>
          ) : null}

          {isCreator && pending.length > 0 ? (
            <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="label">Gelen katılım istekleri</Text>
              {pending.map((req) => (
                <View key={req.id} style={[styles.requestRow, { borderColor: colors.border }]}>
                  <Text variant="body">
                    {req.requester.fullName ?? req.requester.username}
                    {req.companion ? ` + ${req.companion.fullName ?? req.companion.username}` : ''}
                  </Text>
                  {req.message ? (
                    <Text secondary variant="caption" numberOfLines={2}>
                      {req.message}
                    </Text>
                  ) : null}
                  <View style={styles.requestActions}>
                    <Pressable
                      onPress={() =>
                        void respondDateJoinRequest(req.id, false).then(({ error }) => {
                          if (error) Alert.alert('Reddedilemedi', error);
                          else void load();
                        })
                      }
                      style={[styles.reqBtn, { backgroundColor: `${colors.danger}14` }]}
                    >
                      <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                        Reddet
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void respondDateJoinRequest(req.id, true).then(({ error }) => {
                          if (error) Alert.alert('Onaylanamadı', error);
                          else void load();
                        })
                      }
                      style={[styles.reqBtn, { backgroundColor: `${DATE_ACCENT}18` }]}
                    >
                      <Text variant="caption" style={{ color: DATE_ACCENT, fontWeight: '700' }}>
                        Onayla
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            {canJoin ? (
              <Button title="Katılmak istiyorum" onPress={() => setJoinOpen(true)} />
            ) : null}
            {outing.myPendingRequestId ? (
              <Button title="İsteği geri çek" variant="ghost" onPress={() => void handleWithdraw()} />
            ) : null}
            {canChat ? (
              <Button
                title={acting ? 'Açılıyor...' : 'Trip sohbete git'}
                variant="secondary"
                onPress={() => void openChat()}
                disabled={acting}
              />
            ) : null}
            {isCreator && outing.status !== 'cancelled' ? (
              <Button title="Date\'i iptal et" variant="ghost" onPress={handleCancel} />
            ) : null}
          </View>
        </ScrollView>

        <DateJoinRequestSheet
          visible={joinOpen}
          outing={outing}
          onClose={() => setJoinOpen(false)}
          onSuccess={() => void load()}
        />
      </GradientBackground>
    </DateAccessGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: { fontWeight: '800', flex: 1 },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  block: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bodyText: { lineHeight: 22 },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileCopy: { flex: 1 },
  requestRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    gap: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reqBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
