import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { InboxConversationRow } from '@/features/messaging/components/InboxConversationRow';
import { useConversationList } from '@/features/messaging/hooks/useConversationList';
import { useMessageDrafts } from '@/features/messaging/hooks/useMessageDrafts';
import { useChatTheme } from '@/features/messaging/hooks/useChatTheme';
import { conversationTitle, formatConversationDraftPreview } from '@/features/messaging/utils';
import { useMessagingStore } from '@/features/messaging/store/messagingStore';
import { fetchRestrictedUserIds } from '@/features/moderation/services/relationships';
import { IZDIVAC_ACCENT } from '@/features/izdivac/constants';
import { useIzdivacMessages } from '@/features/izdivac/hooks/useIzdivacMessages';
import { openIzdivacChat } from '@/features/izdivac/services/izdivacMessagingNavigation';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

export function IzdivacConversationInbox() {
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const chat = useChatTheme();
  const { user } = useAuth();
  const { conversations: allConversations, refresh, refreshSilent } = useConversationList(isFocused, false);
  const { conversations: izdivacLinks, loading: linksLoading, error, refresh: refreshLinks } = useIzdivacMessages();
  const draftByConversationId = useMessagingStore((s) => s.draftByConversationId);
  useMessageDrafts(user?.id);
  const [query, setQuery] = useState('');
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set());

  const izdivacIdSet = useMemo(
    () => new Set(izdivacLinks.map((item) => item.conversationId)),
    [izdivacLinks],
  );

  const conversations = useMemo(
    () => allConversations.filter((item) => izdivacIdSet.has(item.id)),
    [allConversations, izdivacIdSet],
  );

  const pullRefresh = useCallback(() => {
    void refresh();
    void refreshLinks();
  }, [refresh, refreshLinks]);

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

  useFocusEffect(
    useCallback(() => {
      void refreshSilent();
      void refreshLinks();
    }, [refreshSilent, refreshLinks]),
  );

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

  const handleOpen = useCallback(
    (item: (typeof conversations)[number], unread: number) => {
      openIzdivacChat(item.id, {
        unreadCount: unread,
        userId: user?.id,
      });
    },
    [user?.id],
  );

  const listPerf = getAndroidFlatListPerfProps();

  return (
    <View style={styles.container}>
      <View style={[styles.searchRow, { backgroundColor: chat.searchBg, borderColor: chat.rowBorder }]}>
        <Ionicons name="search-outline" size={15} color={colors.textMuted} />
        <TextInput
          style={[styles.search, { color: colors.text }]}
          placeholder="İzdivaç sohbetlerinde ara…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={15} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={linksLoading} onRefresh={pullRefresh} tintColor={IZDIVAC_ACCENT} />
        }
        {...listPerf}
        ListEmptyComponent={
          linksLoading ? (
            <ActivityIndicator color={IZDIVAC_ACCENT} style={{ marginTop: spacing.lg }} />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textMuted} />
              <Text secondary variant="caption" style={styles.emptyText}>
                İzdivaç sohbetiniz yok. Üyelerden mesaj başlatın veya bir görüşme alanına katılın.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <InboxConversationRow
            item={item}
            showArchived={false}
            onChanged={pullRefresh}
            onOpen={handleOpen}
          />
        )}
        ListFooterComponent={
          error ? (
            <Text variant="caption" style={{ color: colors.danger, textAlign: 'center', fontSize: 11 }}>
              {error}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
});
