import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { LiveSupportComposer, type LiveSupportComposerHandle } from '@/features/live-support/components/LiveSupportComposer';
import {
  LiveSupportMessageBubble,
  liveSupportBubbleMargin,
} from '@/features/live-support/components/LiveSupportMessageBubble';
import { ChatMediaViewerProvider } from '@/features/messaging/context/ChatMediaViewerContext';
import {
  LIVE_SUPPORT_SESSION_HINT,
  LIVE_SUPPORT_STATUS_LABELS,
  MIN_LIVE_SUPPORT_MESSAGE_LENGTH,
} from '@/features/live-support/constants';
import { useLiveSupportRealtime } from '@/features/live-support/hooks/useLiveSupportRealtime';
import {
  pickLiveSupportImageFromLibrary,
  pickLiveSupportVideoFromLibrary,
} from '@/features/live-support/services/liveSupportPickMedia';
import {
  adminFetchLiveSupportThread,
  adminUpdateLiveSupportThread,
  fetchLiveSupportMessages,
  markLiveSupportRead,
  sendLiveSupportMessage,
} from '@/features/live-support/services/liveSupportData';
import {
  uploadLiveSupportImage,
  uploadLiveSupportVideo,
} from '@/features/live-support/services/liveSupportMedia';
import {
  buildLiveSupportMessage,
  mergeLiveSupportMessages,
} from '@/features/live-support/utils/messageList';
import { useLiveSupportPendingVideoStore } from '@/features/live-support/store/pendingVideoStore';
import type { LiveSupportMessage, LiveSupportMessageType, LiveSupportThread } from '@/features/live-support/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function AdminLiveSupportChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const guard = useAdminGuard();
  const [thread, setThread] = useState<LiveSupportThread | null>(null);
  const [messages, setMessages] = useState<LiveSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const composerRef = useRef<LiveSupportComposerHandle>(null);
  const captionRef = useRef('');
  const listRef = useRef<FlatList<LiveSupportMessage>>(null);
  const messagesRef = useRef<LiveSupportMessage[]>([]);
  const knownIdsRef = useRef(new Set<string>());

  messagesRef.current = messages;

  const load = useCallback(async () => {
    if (!id || guard.status !== 'allowed') return;
    setLoading(true);
    const nextThread = await adminFetchLiveSupportThread(id);
    setThread(nextThread);
    if (nextThread) {
      const rows = await fetchLiveSupportMessages(nextThread.id);
      knownIdsRef.current = new Set(rows.map((row) => row.id));
      setMessages(rows);
      await markLiveSupportRead(nextThread.id);
    } else {
      setMessages([]);
      knownIdsRef.current.clear();
    }
    setLoading(false);
  }, [guard.status, id]);

  const refreshThread = useCallback(async () => {
    if (!id || guard.status !== 'allowed') return null;
    const nextThread = await adminFetchLiveSupportThread(id);
    setThread(nextThread);
    return nextThread;
  }, [guard.status, id]);

  const reloadMessages = useCallback(async (threadId: string) => {
    const rows = await fetchLiveSupportMessages(threadId);
    setMessages((current) => {
      const merged = mergeLiveSupportMessages(rows, current);
      knownIdsRef.current = new Set(merged.map((row) => row.id));
      return merged;
    });
    await markLiveSupportRead(threadId);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveSupportRealtime({
    threadId: thread?.id ?? null,
    onNewMessage: (message) => {
      if (knownIdsRef.current.has(message.id)) return;
      knownIdsRef.current.add(message.id);
      setMessages((current) => [...current, message]);
      if (thread?.id) void markLiveSupportRead(thread.id);
      void refreshThread();
    },
    onThreadUpdated: () => {
      void refreshThread();
    },
  });

  const handleSend = async (
    content: string,
    options?: {
      messageType?: LiveSupportMessageType;
      mediaUrl?: string | null;
    },
  ) => {
    if (!thread) return;
    const trimmed = content.trim();
    const isMedia = options?.messageType === 'image' || options?.messageType === 'video';
    if (!options?.mediaUrl && !isMedia && trimmed.length < MIN_LIVE_SUPPORT_MESSAGE_LENGTH) return;

    setSending(true);
    const { messageId, error } = await sendLiveSupportMessage(thread.id, trimmed, options);
    setSending(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    if (messageId && user?.id) {
      if (!knownIdsRef.current.has(messageId)) {
        knownIdsRef.current.add(messageId);
        setMessages((current) => [
          ...current,
          buildLiveSupportMessage({
            id: messageId,
            threadId: thread.id,
            senderId: user.id,
            content: trimmed,
            messageType: options?.messageType,
            mediaUrl: options?.mediaUrl,
            isStaff: true,
          }),
        ]);
      }
    }

    composerRef.current?.clearDraft();
    captionRef.current = '';
    await reloadMessages(thread.id);
    await refreshThread();
    listRef.current?.scrollToEnd({ animated: true });
  };

  const uploadAndSendVideo = useCallback(
    async (uri: string, durationSec: number) => {
      if (!user?.id) return;
      setSending(true);
      const { url, error } = await uploadLiveSupportVideo(user.id, uri, { durationSec });
      if (error || !url) {
        setSending(false);
        Alert.alert('Hata', error ?? 'Video yüklenemedi');
        return;
      }
      await handleSend(captionRef.current, { messageType: 'video', mediaUrl: url });
      setSending(false);
    },
    [handleSend, user?.id],
  );

  const pickImage = async () => {
    if (!user?.id) return;
    const asset = await pickLiveSupportImageFromLibrary();
    if (!asset?.uri) return;

    setSending(true);
    const { url, error } = await uploadLiveSupportImage(user.id, asset.uri, asset.mimeType ?? undefined);
    if (error || !url) {
      setSending(false);
      Alert.alert('Hata', error ?? 'Görsel yüklenemedi');
      return;
    }

    await handleSend(captionRef.current, { messageType: 'image', mediaUrl: url });
    setSending(false);
  };

  const pickVideo = async () => {
    const picked = await pickLiveSupportVideoFromLibrary();
    if (!picked) return;
    await uploadAndSendVideo(picked.uri, picked.durationSec);
  };

  useFocusEffect(
    useCallback(() => {
      const pending = useLiveSupportPendingVideoStore.getState().consumePending();
      if (pending) {
        void uploadAndSendVideo(pending.uri, pending.durationSec);
      }
    }, [uploadAndSendVideo]),
  );

  const confirmStatusUpdate = (
    title: string,
    message: string,
    confirmLabel: string,
    status: LiveSupportThread['status'],
    destructive = false,
  ) => {
    if (!thread) return;
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          const { error } = await adminUpdateLiveSupportThread(thread.id, status);
          if (error) Alert.alert('Hata', error);
          else void refreshThread();
        },
      },
    ]);
  };

  const handleReopen = () => {
    confirmStatusUpdate(
      'Desteği aç',
      'Kullanıcıya sohbetin yeniden açıldığı bildirilecek.',
      'Aç',
      'waiting_support',
    );
  };

  const handleResolve = () => {
    confirmStatusUpdate('Çözüldü', 'Talep çözüldü olarak işaretlenecek.', 'Çözüldü', 'resolved');
  };

  const handleNoResponse = () => {
    confirmStatusUpdate(
      'Kullanıcı cevap vermedi',
      'Sohbet yanıt alınamadığı için kapatılacak. Kullanıcı yeni mesaj yazarsa tekrar açılır.',
      'Kaydet',
      'no_response',
      true,
    );
  };

  const handleClose = () => {
    confirmStatusUpdate(
      'Desteği kapat',
      'Sohbet kapatılacak. Kullanıcı yeni mesaj yazarsa tekrar açılır.',
      'Kapat',
      'closed',
      true,
    );
  };

  if (loading || !thread) {
    return (
      <AdminShell title="Canlı Destek" requireAdmin scrollable={false}>
        <AdminEmptyState loading={loading} title={loading ? undefined : 'Sohbet bulunamadı'} />
      </AdminShell>
    );
  }

  const isClosed =
    thread.status === 'closed' || thread.status === 'resolved' || thread.status === 'no_response';

  return (
    <ChatMediaViewerProvider>
      <AdminShell
        title="Canlı Destek Sohbeti"
        subtitle={`@${thread.username ?? 'kullanıcı'}`}
        requireAdmin
        scrollable={false}
      >
        <View style={styles.layout}>
          <GlassCard style={styles.metaCard}>
            <Text variant="label">{thread.full_name ?? thread.username}</Text>
            <Text secondary variant="caption">
              {LIVE_SUPPORT_STATUS_LABELS[thread.status]}
              {thread.topic ? ` · ${thread.topic}` : ''}
            </Text>
            {thread.session_expires_at && !isClosed ? (
              <Text variant="caption" style={{ color: colors.warning }}>
                Yanıt süresi: {new Date(thread.session_expires_at).toLocaleTimeString('tr-TR')}
              </Text>
            ) : null}
            <Text secondary variant="caption">
              {LIVE_SUPPORT_SESSION_HINT}
            </Text>
            <View style={styles.actionRow}>
              {isClosed ? (
                <Button title="Desteği Aç" onPress={handleReopen} style={styles.actionBtn} />
              ) : (
                <>
                  <Button title="Çözüldü" variant="outline" onPress={handleResolve} style={styles.actionBtn} />
                  <Button
                    title="Cevap yok"
                    variant="outline"
                    onPress={handleNoResponse}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Kapat"
                    variant="outline"
                    onPress={handleClose}
                    style={styles.actionBtn}
                  />
                </>
              )}
            </View>
          </GlassCard>

          <KeyboardAvoidingView
            style={styles.chatArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item, index }) => {
                const isMine = item.sender_id === user?.id;
                const prev = messagesRef.current[index - 1];
                const next = messagesRef.current[index + 1];
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
              }}
            />

            <LiveSupportComposer
              ref={composerRef}
              onSend={(content) => {
                captionRef.current = content;
                void handleSend(content);
              }}
              onPickImage={() => void pickImage()}
              onPickVideo={() => void pickVideo()}
              sending={sending}
            />
          </KeyboardAvoidingView>
        </View>
      </AdminShell>
    </ChatMediaViewerProvider>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, minHeight: 0, gap: spacing.sm },
  metaCard: { flexShrink: 0, gap: spacing.sm },
  chatArea: { flex: 1, minHeight: 0 },
  list: { flex: 1 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: { flexGrow: 1, minWidth: 96 },
  messageList: { paddingBottom: spacing.md, paddingTop: spacing.xs, flexGrow: 1 },
});
