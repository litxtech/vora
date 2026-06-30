import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  deleteAllInboxNotifications,
  deleteNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationClicked,
} from '@/features/notifications/services/notificationData';
import {
  getCachedNotifications,
  setCachedNotifications,
} from '@/features/notifications/services/notificationsInboxCache';
import { NotificationCategoryTabs } from '@/features/notifications/components/NotificationCategoryTabs';
import { NotificationInboxCard } from '@/features/notifications/components/NotificationInboxCard';
import { NotificationSelectionBar } from '@/features/notifications/components/NotificationSelectionBar';
import {
  fetchNotificationActorProfiles,
  type NotificationActorProfile,
} from '@/features/notifications/services/notificationActorProfiles';
import type { NotificationCategoryId } from '@/constants/notifications';
import type { AppNotification } from '@/lib/notifications/types';
import { radius, spacing } from '@/constants/theme';
import { showNotificationInboxMenu } from '@/features/notifications/utils/notificationInboxMenu';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { navigateFromNotification } from '@/lib/notifications/navigation';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { NOTIFICATIONS_FEATURE } from '@/features/notifications/featureFlags';
import { getAndroidFlatListPerfProps, getNavigationRepeatGuardMs } from '@/lib/device/androidPerfProfile';
import { AccountLinkRequestNotificationActions } from '@/features/account-switch/components/AccountLinkRequestNotificationActions';
import {
  fetchPendingAccountLinkRequestIds,
  isPendingAccountLinkNotification,
} from '@/features/account-switch/services/accountLinkRequests';

export function NotificationsInboxScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshUnread } = useNotifications();
  const showInboxMenu = useFeatureVisible(NOTIFICATIONS_FEATURE.inboxMenu);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [actors, setActors] = useState<Map<string, NotificationActorProfile>>(new Map());
  const [category, setCategory] = useState<NotificationCategoryId>('all');
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pendingLinkRequestIds, setPendingLinkRequestIds] = useState<Set<string>>(new Set());
  const navigatingRef = useRef(false);

  const refreshPendingLinkRequests = useCallback(async () => {
    if (!user?.id) {
      setPendingLinkRequestIds(new Set());
      return;
    }
    const ids = await fetchPendingAccountLinkRequestIds(user.id);
    setPendingLinkRequestIds(ids);
  }, [user?.id]);

  const load = useCallback(async (background = false) => {
    if (!user) return;

    if (!background) {
      const cached = getCachedNotifications(user.id, category);
      if (cached?.length) {
        setItems(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    const data = await fetchNotifications(user.id, category);
    setCachedNotifications(user.id, category, data);
    setItems(data);
    setLoading(false);

    const actorIds = data.map((item) => item.actorId).filter((id): id is string => !!id);
    void fetchNotificationActorProfiles(actorIds).then(setActors);
  }, [user?.id, category]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    await refreshUnread();
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now, openedAt: now })),
    );
  }, [user?.id, refreshUnread]);

  useEffect(() => {
    void load(false);
    void refreshPendingLinkRequests();
  }, [load, refreshPendingLinkRequests]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void markAllAsRead();
      const cached = getCachedNotifications(user.id, category);
      if (cached?.length) {
        void load(true);
      }
    }, [user?.id, category, markAllAsRead, load]),
  );

  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [category]);

  const unreadByCategory = useMemo(() => {
    const counts: Partial<Record<NotificationCategoryId, number>> = { all: 0 };
    for (const item of items) {
      if (!item.readAt) {
        counts.all = (counts.all ?? 0) + 1;
        counts[item.category] = (counts[item.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (initialId?: string) => {
    setSelectionMode(true);
    setSelectedIds(initialId ? new Set([initialId]) : new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const handlePress = async (item: AppNotification) => {
    if (item.eventType === 'account_link_request') {
      if (!item.clickedAt) {
        await markNotificationClicked(item.id);
        await refreshUnread();
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, readAt: new Date().toISOString(), clickedAt: new Date().toISOString() }
              : n,
          ),
        );
      }
      return;
    }

    if (navigatingRef.current) return;
    navigatingRef.current = true;

    try {
      if (!item.clickedAt) {
        await markNotificationClicked(item.id);
        await refreshUnread();
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, readAt: new Date().toISOString(), clickedAt: new Date().toISOString() }
              : n,
          ),
        );
      }
      navigateFromNotification(item.eventType, item.data, item.actorId, item.id, { fromInbox: true });
    } finally {
      setTimeout(() => {
        navigatingRef.current = false;
      }, getNavigationRepeatGuardMs());
    }
  };

  const handleReadAll = async () => {
    await markAllAsRead();
  };

  const removeDeletedItems = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    setDeleting(true);
    try {
      await deleteNotifications(user.id, ids);
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      await refreshUnread();
      exitSelectionMode();
    } catch {
      Alert.alert('Silinemedi', 'Bildirimler silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteSelected = () => {
    const count = selectedIds.size;
    if (!user || count === 0) return;

    Alert.alert(
      'Seçilenleri sil',
      `${count} bildirim kalıcı olarak silinecek. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => void removeDeletedItems([...selectedIds]),
        },
      ],
    );
  };

  const hasUnread = (unreadByCategory.all ?? 0) > 0;

  const openInboxMenu = () => {
    showNotificationInboxMenu({
      hasItems: items.length > 0,
      hasUnread,
      onSelect: () => enterSelectionMode(),
      onSettings: () => router.push('/settings/notifications' as never),
      onMarkAllRead: () => void handleReadAll(),
      onDeleteAll: confirmDeleteAll,
    });
  };

  const confirmDeleteAll = () => {
    if (!user || items.length === 0) return;

    const scopeLabel =
      category === 'all' ? 'tüm bildirimler' : 'bu kategorideki tüm bildirimler';

    Alert.alert(
      'Tümünü sil',
      `Görünen ${scopeLabel} kalıcı olarak silinecek. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tümünü sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteAllInboxNotifications(user.id, category);
                setItems([]);
                await refreshUnread();
                exitSelectionMode();
              } catch {
                Alert.alert(
                  'Silinemedi',
                  'Bildirimler silinirken bir hata oluştu. Lütfen tekrar deneyin.',
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const listPerf = getAndroidFlatListPerfProps();

  const handleLinkRequestResolved = useCallback(
    (notificationId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== notificationId));
      void refreshPendingLinkRequests();
      void refreshUnread();
    },
    [refreshPendingLinkRequests, refreshUnread],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const requestId =
        typeof item.data?.request_id === 'string' ? item.data.request_id : null;
      const showLinkActions =
        requestId &&
        isPendingAccountLinkNotification(item.eventType, item.data, pendingLinkRequestIds);

      return (
        <NotificationInboxCard
          item={item}
          actor={item.actorId ? actors.get(item.actorId) ?? null : null}
          selectionMode={selectionMode}
          selected={selectedIds.has(item.id)}
          onToggleSelect={() => toggleSelection(item.id)}
          onLongPress={() => enterSelectionMode(item.id)}
          onPress={() => handlePress(item)}
          footer={
            showLinkActions ? (
              <AccountLinkRequestNotificationActions
                requestId={requestId}
                requesterId={
                  typeof item.data?.requester_id === 'string' ? item.data.requester_id : undefined
                }
                onResolved={() => handleLinkRequestResolved(item.id)}
              />
            ) : undefined
          }
        />
      );
    },
    [actors, selectionMode, selectedIds, pendingLinkRequestIds, handleLinkRequestResolved],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <AuthHeader
          title="Bildirim Merkezi"
          subtitle="Sosyal, mesaj, iş ilanı ve acil durumlar"
          trailing={
            !selectionMode && showInboxMenu ? (
              <Pressable
                onPress={openInboxMenu}
                onLongPress={() => {
                  if (items.length > 0) enterSelectionMode();
                }}
                delayLongPress={400}
                style={[styles.menuBtn, { backgroundColor: `${colors.surfaceElevated}CC` }]}
                hitSlop={8}
                disabled={deleting}
                accessibilityLabel="Bildirim seçenekleri"
                accessibilityHint="Basılı tutarak seçim modunu açabilirsiniz"
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
              </Pressable>
            ) : null
          }
        />

        <NotificationCategoryTabs
          active={category}
          onChange={setCategory}
          unreadByCategory={unreadByCategory}
        />
      </View>
    ),
    [category, colors.surfaceElevated, colors.text, deleting, items.length, openInboxMenu, selectionMode, showInboxMenu, unreadByCategory],
  );

  return (
    <GradientBackground>
      <View style={styles.shell}>
        <FlatList
          data={loading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <GlassCard style={styles.emptyCard}>
                <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}>
                  <Ionicons name="notifications-off-outline" size={28} color={colors.primary} />
                </View>
                <Text variant="label">
                  {category === 'all' ? 'Henüz bildirim yok' : 'Bu kategoride bildirim yok'}
                </Text>
                <Text secondary variant="caption" style={styles.emptyCopy}>
                  {category === 'all'
                    ? 'Beğeni, yorum, iş ilanı ve acil uyarılar burada görünür.'
                    : 'Başka bir sekme seçerek geçmiş bildirimlere bakabilirsiniz.'}
                </Text>
              </GlassCard>
            )
          }
          contentContainerStyle={[
            styles.page,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom:
                insets.bottom + spacing.xxl + (selectionMode ? 72 : 0),
            },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          {...listPerf}
        />

        {selectionMode ? (
          <View style={{ paddingBottom: insets.bottom }}>
            <NotificationSelectionBar
              count={selectedIds.size}
              total={items.length}
              onCancel={exitSelectionMode}
              onToggleSelectAll={toggleSelectAll}
              onDelete={confirmDeleteSelected}
              deleting={deleting}
            />
          </View>
        ) : null}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  page: { paddingHorizontal: spacing.lg },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  loader: { marginTop: spacing.lg },
  separator: { height: spacing.md },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: { textAlign: 'center' },
});
