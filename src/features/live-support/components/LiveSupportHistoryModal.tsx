import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  LiveSupportMessageBubble,
  liveSupportBubbleMargin,
} from '@/features/live-support/components/LiveSupportMessageBubble';
import { LIVE_SUPPORT_ACCENT, LIVE_SUPPORT_STATUS_LABELS } from '@/features/live-support/constants';
import type { LiveSupportMessage, LiveSupportThread } from '@/features/live-support/types';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LiveSupportHistoryModalProps = {
  visible: boolean;
  thread: LiveSupportThread | null;
  messages: LiveSupportMessage[];
  loading: boolean;
  userId: string | undefined;
  onClose: () => void;
};

export function LiveSupportHistoryModal({
  visible,
  thread,
  messages,
  loading,
  userId,
  onClose,
}: LiveSupportHistoryModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const messagesRef = useRef<LiveSupportMessage[]>([]);
  messagesRef.current = messages;

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessage = useCallback(
    ({ item }: { item: LiveSupportMessage }) => {
      const index = messagesRef.current.findIndex((row) => row.id === item.id);
      const isMine = item.sender_id === userId;
      const prev = index > 0 ? messagesRef.current[index - 1] : undefined;
      const next = index >= 0 ? messagesRef.current[index + 1] : undefined;
      const showSenderAvatar = !isMine && (!prev || prev.sender_id !== item.sender_id);
      const showSenderHeader = !isMine && (!prev || prev.sender_id !== item.sender_id);

      return (
        <LiveSupportMessageBubble
          message={item}
          isMine={isMine}
          showSenderAvatar={showSenderAvatar}
          showSenderHeader={showSenderHeader}
          marginBottom={liveSupportBubbleMargin(item, next)}
        />
      );
    },
    [userId],
  );

  const closedLabel = thread ? LIVE_SUPPORT_STATUS_LABELS[thread.status] : '';
  const closedDate = thread?.resolved_at ?? thread?.updated_at;

  return (
    <Modal
      visible={visible}
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="label" style={styles.title}>
              Geçmiş Destek
            </Text>
            {thread && closedDate ? (
              <Text secondary variant="caption" style={styles.subtitle}>
                {closedLabel} · {formatDeletedAccountDate(closedDate)}
              </Text>
            ) : null}
          </View>
          <View style={styles.closeBtn} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={LIVE_SUPPORT_ACCENT} size="large" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
            <Text secondary variant="caption">
              Geçmiş mesaj bulunamadı
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 11,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
});
