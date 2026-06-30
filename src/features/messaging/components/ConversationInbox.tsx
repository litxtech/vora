import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchRestrictedUserIds } from '@/features/moderation/services/relationships';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useConversationList } from '../hooks/useConversationList';
import { fetchConversationList } from '../services/conversationData';
import { conversationTitle, formatConversationDraftPreview } from '../utils';
import { InboxConversationRow } from './InboxConversationRow';
import { useChatTheme } from '../hooks/useChatTheme';
import { useMessageDrafts } from '../hooks/useMessageDrafts';
import { useMessagingStore } from '../store/messagingStore';
import { getAndroidFlatListPerfProps, shouldDeferHeavyFocusWork } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';

export function ConversationInbox() {
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const showNewChat = useFeatureVisible(MESSAGING_FEATURE.newChat);
  const showCreateGroup = useFeatureVisible(MESSAGING_FEATURE.createGroup);
  const showArchive = useFeatureVisible(MESSAGING_FEATURE.archive);
  const chat = useChatTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { conversations, refresh, refreshSilent } = useConversationList(isFocused, showArchived);
  const draftByConversationId = useMessagingStore((s) => s.draftByConversationId);
  useMessageDrafts(user?.id);
  const [query, setQuery] = useState('');
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set());
  const [archivedCount, setArchivedCount] = useState(0);

  const pullRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchRestrictedUserIds(user.id).then((ids) => {
      if (!cancelled) setRestrictedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, conversations.length]);

  useEffect(() => {
    if (showArchived) return;
    let cancelled = false;
    void fetchConversationList(true).then((list) => {
      if (!cancelled) setArchivedCount(list.length);
    });
    return () => {
      cancelled = true;
    };
  }, [showArchived, conversations.length]);

  useFocusEffect(
    useCallback(() => {
      const run = () => {
        void refreshSilent();
      };

      if (shouldDeferHeavyFocusWork()) {
        const task = deferBackgroundWork(run);
        return () => task.cancel();
      }

      run();
      return undefined;
    }, [refreshSilent]),
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof conversations)[number] }) => (
      <InboxConversationRow item={item} showArchived={showArchived} onChanged={refresh} />
    ),
    [showArchived, refresh],
  );

  const keyExtractor = useCallback((item: (typeof conversations)[number]) => item.id, []);

  const filtered = useMemo(() => {
    const inbox = conversations.filter(
      (c) => !(c.type === 'direct' && c.otherUser && restrictedIds.has(c.otherUser.id)),
    );
    const q = query.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((item) => {
      const title = conversationTitle(item).toLowerCase();
      const preview = (item.lastMessagePreview ?? '').toLowerCase();
      const draft = draftByConversationId[item.id];
      const draftPreview = draft?.trim() ? formatConversationDraftPreview(draft).toLowerCase() : '';
      return title.includes(q) || preview.includes(q) || draftPreview.includes(q);
    });
  }, [conversations, query, restrictedIds, draftByConversationId]);

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={[styles.searchRow, { backgroundColor: chat.searchBg, borderColor: chat.rowBorder }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.search, { color: colors.text }]}
            placeholder={showArchived ? 'Arşivde ara…' : 'Sohbet veya mesaj ara…'}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {!showArchived && (showNewChat || showCreateGroup) ? (
          <View style={styles.quickActions}>
            {showNewChat ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: chat.rowBorder }]}
                onPress={async () => {
                  if (!(await requireAuth('Mesaj'))) return;
                  router.push('/chat/new');
                }}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </Pressable>
            ) : null}
            {showCreateGroup ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!(await requireAuth('Grup oluşturma'))) return;
                  router.push('/chat/create-group');
                }}
              >
                <Ionicons name="people-outline" size={15} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {showArchive ? (
        <Pressable
          style={[styles.archiveToggle, { backgroundColor: chat.rowBg, borderColor: chat.rowBorder }]}
          onPress={() => setShowArchived((v) => !v)}
        >
          <View style={[styles.archiveIcon, { backgroundColor: `${colors.primary}14` }]}>
            <Ionicons
              name={showArchived ? 'chatbubbles-outline' : 'archive-outline'}
              size={14}
              color={colors.primary}
            />
          </View>
          <Text variant="caption" style={{ fontWeight: '600' }}>
            {showArchived ? 'Sohbetlere dön' : 'Arşivlenmiş sohbetler'}
          </Text>
          {!showArchived && archivedCount > 0 ? (
            <View style={[styles.archiveBadge, { backgroundColor: colors.primary }]}>
              <Text variant="caption" style={styles.archiveBadgeText}>
                {archivedCount}
              </Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.archiveChevron} />
          )}
        </Pressable>
      ) : null}

      <FlatList
        style={styles.listFlex}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={pullRefresh}
        showsVerticalScrollIndicator={false}
        {...getAndroidFlatListPerfProps()}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
            </View>
            <Text variant="label">
              {showArchived ? 'Arşiv boş' : 'Henüz sohbet yok'}
            </Text>
            <Text secondary style={styles.empty}>
              {showArchived
                ? 'Arşivlenmiş sohbet bulunmuyor.'
                : 'Yeni mesaj göndermek için yukarıdaki kalem simgesine dokunun.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    gap: spacing.sm,
  },
  listFlex: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  search: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  archiveIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBadge: {
    marginLeft: 'auto',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  archiveBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  archiveChevron: {
    marginLeft: 'auto',
  },
  list: {
    gap: 6,
    paddingBottom: spacing.xxl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  empty: {
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
});
