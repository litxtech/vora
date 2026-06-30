import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchConversationList } from '../services/conversationData';
import { sendMessage } from '../services/messageData';
import type { ChatMessage, ConversationListItem } from '../types';
import { conversationTitle } from '../utils';

type ForwardSheetProps = {
  visible: boolean;
  message?: ChatMessage | null;
  messages?: ChatMessage[];
  senderId: string;
  currentConversationId?: string;
  onClose: () => void;
  onForwarded?: () => void;
};

export function ForwardSheet({
  visible,
  message,
  messages,
  senderId,
  currentConversationId,
  onClose,
  onForwarded,
}: ForwardSheetProps) {
  const items = messages?.length ? messages : message ? [message] : [];
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchConversationList()
      .then((list) => setConversations(list.filter((c) => c.id !== currentConversationId)))
      .finally(() => setLoading(false));
  }, [visible, currentConversationId]);

  const forwardTo = async (conversationId: string) => {
    if (!message) return;
    setBusyId(conversationId);
    const { error } = await sendMessage(conversationId, senderId, message.content, {
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      forwardedFromId: message.id,
    });
    setBusyId(null);
    if (error) return;
    onForwarded?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text variant="h3" style={styles.title}>
            {items.length > 1 ? `${items.length} mesajı ilet` : 'İlet'}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => forwardTo(item.id)}
                  disabled={busyId === item.id}
                >
                  <Ionicons
                    name={item.type === 'group' ? 'people' : 'person'}
                    size={20}
                    color={colors.primary}
                  />
                  <Text variant="label" style={styles.rowTitle}>
                    {conversationTitle(item)}
                  </Text>
                  {busyId === item.id ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text secondary>Sohbet bulunamadı</Text>}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '60%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  title: { marginBottom: spacing.md },
  loader: { marginVertical: spacing.xl },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { flex: 1 },
});
