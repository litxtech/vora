import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { fetchRestrictedUserIds } from '@/features/moderation/services/relationships';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { useConversationList } from '../hooks/useConversationList';
import { openChat } from '../services/messagingNavigation';
import type { ConversationListItem } from '../types';
import { ConversationRow } from './ConversationRow';

type RequestRowProps = {
  item: ConversationListItem;
};

const RequestRow = memo(function RequestRow({ item }: RequestRowProps) {
  const handlePress = useCallback(() => {
    openChat(item.id, { unreadCount: item.unreadCount });
  }, [item.id, item.unreadCount]);

  return <ConversationRow item={item} subtitlePrefix="Kısıtlı · " onPress={handlePress} />;
});

export function MessageRequestsInbox() {
  const { user } = useAuth();
  const { conversations, refresh } = useConversationList();
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set());

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

  const requests = useMemo(
    () =>
      conversations.filter(
        (c) => c.type === 'direct' && c.otherUser && restrictedIds.has(c.otherUser.id),
      ),
    [conversations, restrictedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => <RequestRow item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ConversationListItem) => item.id, []);

  return (
    <View style={styles.container}>
      <Text secondary variant="caption" style={styles.hint}>
        Kısıtladığınız kişilerden gelen mesajlar burada görünür. Karşı taraf bilgilendirilmez.
      </Text>

      <FlatList
        style={styles.listFlex}
        data={requests}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={refresh}
        {...getAndroidFlatListPerfProps()}
        ListEmptyComponent={
          <Text secondary style={styles.empty}>
            Mesaj isteği yok.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, gap: spacing.sm },
  listFlex: { flex: 1 },
  hint: { paddingHorizontal: spacing.xs },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
