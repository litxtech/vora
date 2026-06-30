import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { LiveSupportChatFooter } from '@/features/live-support/components/LiveSupportChatFooter';
import {
  LiveSupportMessageBubble,
  liveSupportBubbleMargin,
} from '@/features/live-support/components/LiveSupportMessageBubble';
import { LiveSupportStatusStrip } from '@/features/live-support/components/LiveSupportStatusStrip';
import { ChatConversationLayout } from '@/features/messaging/components/ChatConversationLayout';
import { LIVE_SUPPORT_ACCENT } from '@/features/live-support/constants';
import { useLiveSupportChat } from '@/features/live-support/hooks/useLiveSupportChat';
import { useLiveSupportPendingVideoStore } from '@/features/live-support/store/pendingVideoStore';
import type { LiveSupportMessage, LiveSupportStatus, LiveSupportTopic } from '@/features/live-support/types';
import { ChatMediaViewerProvider } from '@/features/messaging/context/ChatMediaViewerContext';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LiveSupportChatPanelProps = {
  embedded?: boolean;
  initialTopic?: LiveSupportTopic;
  suggestedDraft?: string;
};

function EmptyChatHint() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={Keyboard.dismiss} style={styles.emptyHint}>
      <View style={[styles.emptyIcon, { backgroundColor: `${LIVE_SUPPORT_ACCENT}14` }]}>
        <Ionicons name="chatbubbles-outline" size={22} color={LIVE_SUPPORT_ACCENT} />
      </View>
      <Text variant="label" style={{ fontSize: 14, textAlign: 'center' }}>
        Destek ekibimiz hazır
      </Text>
      <Text secondary variant="caption" style={styles.emptyText}>
        Sorununuzu aşağıdan yazın. Konu seçerek daha hızlı yanıt alabilirsiniz.
      </Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </Pressable>
  );
}

const LiveSupportChatFooterHost = memo(function LiveSupportChatFooterHost({
  threadStatus,
  messagesCount,
  sending,
  initialTopic,
  suggestedDraft,
  sendMessage,
  sendImage,
  sendVideo,
  onSent,
  backgroundColor,
}: {
  threadStatus: LiveSupportStatus | null;
  messagesCount: number;
  sending: boolean;
  initialTopic?: LiveSupportTopic | null;
  suggestedDraft?: string;
  sendMessage: (
    content: string,
    topic?: LiveSupportTopic | null,
  ) => Promise<{ error: string | null }>;
  sendImage: (
    localUri: string,
    caption?: string,
    topic?: LiveSupportTopic | null,
    mimeType?: string,
  ) => Promise<{ error: string | null }>;
  sendVideo: (
    localUri: string,
    caption?: string,
    topic?: LiveSupportTopic | null,
    durationSec?: number,
    mimeType?: string,
  ) => Promise<{ error: string | null }>;
  onSent: () => void;
}) {
  return (
    <LiveSupportChatFooter
      threadStatus={threadStatus}
      messagesCount={messagesCount}
      sending={sending}
      initialTopic={initialTopic}
      suggestedDraft={suggestedDraft}
      sendMessage={sendMessage}
      sendImage={sendImage}
      sendVideo={sendVideo}
      onSent={onSent}
    />
  );
});

function LiveSupportMessageList({
  messages,
  userId,
  listRef,
  loading,
  footer,
  footerBackgroundColor,
}: {
  messages: LiveSupportMessage[];
  userId: string | undefined;
  listRef: RefObject<FlatList<LiveSupportMessage> | null>;
  loading: boolean;
  footer: ReactNode;
  footerBackgroundColor: string;
}) {
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);
  const messagesRef = useRef<LiveSupportMessage[]>([]);
  messagesRef.current = messages;

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

  if (loading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={LIVE_SUPPORT_ACCENT} size="large" />
      </View>
    );
  }

  return (
    <ChatConversationLayout
      listRef={listRef}
      data={displayMessages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      footer={footer}
      footerBackgroundColor={footerBackgroundColor}
      footerSolidColor={footerBackgroundColor}
      contentContainerStyle={messages.length === 0 ? styles.messageListEmpty : undefined}
      listProps={{
        extraData: messages,
        ListFooterComponent: messages.length === 0 ? <EmptyChatHint /> : null,
        onScrollBeginDrag: Keyboard.dismiss,
      }}
    />
  );
}

export function LiveSupportChatPanel({
  embedded = true,
  initialTopic = null,
  suggestedDraft,
}: LiveSupportChatPanelProps) {
  const { colors } = useTheme();
  const { user, thread, messages, loading, sending, sendMessage, sendImage, sendVideo } =
    useLiveSupportChat();
  const listRef = useRef<FlatList<LiveSupportMessage>>(null);
  const messageCountRef = useRef(0);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length > messageCountRef.current) {
      scrollToLatest(true);
    }
    messageCountRef.current = messages.length;
  }, [messages.length, scrollToLatest]);

  const uploadPickedVideo = useCallback(
    async (uri: string, durationSec: number) => {
      const { error: sendError } = await sendVideo(uri, '', initialTopic, durationSec);
      if (!sendError) scrollToLatest(true);
    },
    [initialTopic, scrollToLatest, sendVideo],
  );

  useFocusEffect(
    useCallback(() => {
      const pending = useLiveSupportPendingVideoStore.getState().consumePending();
      if (pending) {
        void uploadPickedVideo(pending.uri, pending.durationSec);
      }
    }, [uploadPickedVideo]),
  );

  const threadStatus = thread?.status ?? null;
  const messagesCount = messages.length;

  const footer = useMemo(
    () => (
      <LiveSupportChatFooterHost
        threadStatus={threadStatus}
        messagesCount={messagesCount}
        sending={sending}
        initialTopic={initialTopic}
        suggestedDraft={suggestedDraft}
        sendMessage={sendMessage}
        sendImage={sendImage}
        sendVideo={sendVideo}
        onSent={() => scrollToLatest(true)}
      />
    ),
    [
      initialTopic,
      messagesCount,
      scrollToLatest,
      sendImage,
      sendMessage,
      sendVideo,
      sending,
      suggestedDraft,
      threadStatus,
    ],
  );

  if (!user) {
    return (
      <GlassCard style={styles.authCard}>
        <View style={[styles.authIcon, { backgroundColor: `${LIVE_SUPPORT_ACCENT}18` }]}>
          <Ionicons name="headset-outline" size={22} color={LIVE_SUPPORT_ACCENT} />
        </View>
        <Text variant="label" style={{ fontSize: 15 }}>
          Canlı destek için giriş yapın
        </Text>
        <Text secondary variant="caption" style={styles.authText}>
          Sorunlarınızı destek ekibine anında iletmek için hesabınıza giriş yapmalısınız.
        </Text>
        <Button
          title="Giriş Yap"
          onPress={() => router.push('/(auth)/login')}
          fullWidth={false}
          style={styles.authBtn}
        />
      </GlassCard>
    );
  }

  return (
    <ChatMediaViewerProvider>
      <View style={[styles.root, embedded && styles.embedded, { backgroundColor: colors.background }]}>
        <LiveSupportStatusStrip thread={thread} compact={embedded} />
        <View style={styles.body}>
          <LiveSupportMessageList
            messages={messages}
            userId={user.id}
            listRef={listRef}
            loading={loading}
            footer={footer}
            footerBackgroundColor={colors.background}
          />
        </View>
      </View>
    </ChatMediaViewerProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  embedded: {
    minHeight: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  authCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  authIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authText: { textAlign: 'center', lineHeight: 17, fontSize: 12 },
  authBtn: { minWidth: 140, paddingHorizontal: spacing.lg },
  messageListEmpty: {
    justifyContent: 'flex-end',
  },
  emptyHint: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 17,
    fontSize: 12,
    maxWidth: 280,
  },
  divider: {
    width: '60%',
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
});
