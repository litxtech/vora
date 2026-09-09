import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { DateAccessGate } from '@/features/date/components/DateAccessGate';
import { DateCard } from '@/features/date/components/DateCard';
import { DateJoinRequestSheet } from '@/features/date/components/DateJoinRequestSheet';
import {
  DATE_ACCENT,
  DATE_CENTER_TABS,
} from '@/features/date/constants';
import type { DateCenterTab, DateJoinRequest, DateOuting } from '@/features/date/types';
import { fetchMyDateOutings, fetchOpenDateOutings } from '@/features/date/services/dateData';
import {
  fetchMyOutgoingJoinRequests,
  fetchPendingRequestsForCreator,
} from '@/features/date/services/dateJoinData';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function RequestRow({
  request,
  showActions,
  onApprove,
  onDecline,
}: {
  request: DateJoinRequest;
  showActions?: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="label" numberOfLines={1}>
        {request.outingTitle ?? 'Date'}
      </Text>
      <Text secondary variant="caption">
        {request.requester.fullName ?? request.requester.username}
        {request.companion ? ` + ${request.companion.fullName ?? request.companion.username}` : ''}
        {' · '}
        {request.seatsRequested} kişi
      </Text>
      {request.message ? (
        <Text secondary variant="caption" numberOfLines={2} style={{ marginTop: 4 }}>
          {request.message}
        </Text>
      ) : null}
      {showActions && request.status === 'pending' ? (
        <View style={styles.requestActions}>
          <Pressable
            onPress={onDecline}
            style={[styles.requestBtn, { backgroundColor: `${colors.danger}14` }]}
          >
            <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
              Reddet
            </Text>
          </Pressable>
          <Pressable
            onPress={onApprove}
            style={[styles.requestBtn, { backgroundColor: `${DATE_ACCENT}18` }]}
          >
            <Text variant="caption" style={{ color: DATE_ACCENT, fontWeight: '700' }}>
              Onayla
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
          {request.status === 'pending' ? 'Bekliyor' : request.status}
        </Text>
      )}
    </View>
  );
}

export function DateCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<DateCenterTab>('discover');
  const [outings, setOutings] = useState<DateOuting[]>([]);
  const [incoming, setIncoming] = useState<DateJoinRequest[]>([]);
  const [outgoing, setOutgoing] = useState<DateJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinOuting, setJoinOuting] = useState<DateOuting | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOutings([]);
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }

    if (tab === 'discover') {
      setOutings(await fetchOpenDateOutings(user.id));
    } else if (tab === 'mine') {
      setOutings(await fetchMyDateOutings(user.id));
    } else {
      const [inc, out] = await Promise.all([
        fetchPendingRequestsForCreator(user.id),
        fetchMyOutgoingJoinRequests(user.id),
      ]);
      setIncoming(inc);
      setOutgoing(out);
    }
    setLoading(false);
  }, [tab, user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCreate = async () => {
    if (!(await requireAuth('Date oluştur'))) return;
    router.push('/date-center/create');
  };

  const handleJoin = async (outing: DateOuting) => {
    if (!(await requireAuth('Katılım isteği'))) return;
    setJoinOuting(outing);
  };

  const handleApprove = async (requestId: string) => {
    const { respondDateJoinRequest } = await import('@/features/date/services/dateJoinData');
    const { error } = await respondDateJoinRequest(requestId, true);
    if (error) {
      const { Alert } = await import('react-native');
      Alert.alert('Onaylanamadı', error);
      return;
    }
    void onRefresh();
  };

  const handleDecline = async (requestId: string) => {
    const { respondDateJoinRequest } = await import('@/features/date/services/dateJoinData');
    const { error } = await respondDateJoinRequest(requestId, false);
    if (error) {
      const { Alert } = await import('react-native');
      Alert.alert('Reddedilemedi', error);
      return;
    }
    void onRefresh();
  };

  return (
    <DateAccessGate>
      <GradientBackground style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <ScreenBackButton />
          <View style={styles.headerCopy}>
            <Text variant="h2" style={styles.headerTitle}>
              Date
            </Text>
            <Text secondary variant="caption">
              Plan paylaş · katılım iste
            </Text>
          </View>
          <Pressable onPress={() => void handleCreate()} style={[styles.createBtn, { backgroundColor: DATE_ACCENT }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {DATE_CENTER_TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? `${DATE_ACCENT}18` : 'transparent',
                    borderColor: active ? DATE_ACCENT : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={active ? DATE_ACCENT : colors.textMuted}
                />
                <Text variant="caption" style={{ fontWeight: '700', color: active ? DATE_ACCENT : colors.textMuted }}>
                  {item.label}
                </Text>
                {item.id === 'requests' && incoming.length > 0 ? (
                  <View style={[styles.badge, { backgroundColor: DATE_ACCENT }]}>
                    <Text variant="caption" style={styles.badgeText}>
                      {incoming.length}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={DATE_ACCENT} style={{ marginTop: spacing.xl }} />
        ) : tab === 'requests' ? (
          <FlatList
            data={[...incoming.map((r) => ({ ...r, _kind: 'incoming' as const })), ...outgoing.map((r) => ({ ...r, _kind: 'outgoing' as const }))]}
            keyExtractor={(item) => `${item._kind}-${item.id}`}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={DATE_ACCENT} />}
            ListHeaderComponent={
              incoming.length > 0 ? (
                <Text variant="label" style={styles.sectionHeading}>
                  Gelen istekler
                </Text>
              ) : null
            }
            renderItem={({ item, index }) => {
              const isIncoming = item._kind === 'incoming';
              const showIncomingHeader = !isIncoming && index === incoming.length && outgoing.length > 0;
              return (
                <>
                  {showIncomingHeader ? (
                    <Text variant="label" style={styles.sectionHeading}>
                      Gönderdiğim istekler
                    </Text>
                  ) : null}
                  <RequestRow
                    request={item}
                    showActions={isIncoming}
                    onApprove={() => void handleApprove(item.id)}
                    onDecline={() => void handleDecline(item.id)}
                  />
                </>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <LinearGradient colors={[`${DATE_ACCENT}22`, `${DATE_ACCENT}08`]} style={styles.emptyIcon}>
                  <Ionicons name="mail-open-outline" size={28} color={DATE_ACCENT} />
                </LinearGradient>
                <Text secondary variant="body" style={{ textAlign: 'center' }}>
                  Henüz istek yok
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={outings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={DATE_ACCENT} />}
            renderItem={({ item }) => (
              <DateCard
                outing={item}
                onPress={() => router.push(`/date-center/${item.id}` as Href)}
                onJoinPress={() => void handleJoin(item)}
                showJoinAction={tab === 'discover'}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <LinearGradient colors={[`${DATE_ACCENT}22`, `${DATE_ACCENT}08`]} style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={28} color={DATE_ACCENT} />
                </LinearGradient>
                <Text secondary variant="body" style={{ textAlign: 'center' }}>
                  {tab === 'discover' ? 'Açık date bulunamadı' : 'Henüz date\'iniz yok'}
                </Text>
                <Pressable onPress={() => void handleCreate()} style={[styles.emptyCta, { borderColor: DATE_ACCENT }]}>
                  <Text variant="label" style={{ color: DATE_ACCENT }}>
                    İlk date\'ini oluştur
                  </Text>
                </Pressable>
              </View>
            }
          />
        )}

        <DateJoinRequestSheet
          visible={!!joinOuting}
          outing={joinOuting}
          onClose={() => setJoinOuting(null)}
          onSuccess={() => void onRefresh()}
        />
      </GradientBackground>
    </DateAccessGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontWeight: '900', letterSpacing: -0.4 },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  sectionHeading: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  requestCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  requestBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
