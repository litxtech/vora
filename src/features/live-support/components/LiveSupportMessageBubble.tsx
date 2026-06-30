import { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ChatMediaAttachment } from '@/features/messaging/components/ChatMediaAttachment';
import { ChatVideoAttachment } from '@/features/messaging/components/ChatVideoAttachment';
import { ChatSenderAvatar } from '@/features/messaging/components/ChatSenderAvatar';
import {
  CHAT_BUBBLE_GAP,
  CHAT_BUBBLE_RADIUS,
  CHAT_LIST_HORIZONTAL_PAD,
  CHAT_SENDER_AVATAR_GAP,
  CHAT_SENDER_GAP,
  chatGroupBubbleMaxWidth,
} from '@/features/messaging/constants';
import { useChatTheme } from '@/features/messaging/hooks/useChatTheme';
import type { MessagingParticipant } from '@/features/messaging/types';
import { displayParticipantName, formatMessageTime } from '@/features/messaging/utils';
import { LIVE_SUPPORT_ACCENT } from '@/features/live-support/constants';
import type { LiveSupportMessage } from '@/features/live-support/types';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LiveSupportMessageBubbleProps = {
  message: LiveSupportMessage;
  isMine: boolean;
  showSenderAvatar?: boolean;
  showSenderHeader?: boolean;
  marginBottom?: number;
};

function toParticipant(message: LiveSupportMessage): MessagingParticipant {
  return {
    id: message.sender_id,
    username: message.sender_username ?? 'kullanici',
    full_name: message.sender_full_name ?? null,
    avatar_url: message.sender_avatar_url ?? null,
    account_status: message.sender_account_status,
  };
}

export const LiveSupportMessageBubble = memo(function LiveSupportMessageBubble({
  message,
  isMine,
  showSenderAvatar = true,
  showSenderHeader = true,
  marginBottom = CHAT_BUBBLE_GAP,
}: LiveSupportMessageBubbleProps) {
  const { colors } = useTheme();
  const chat = useChatTheme();
  const { width: screenWidth } = useWindowDimensions();
  const groupBubbleMaxWidth = useMemo(
    () => chatGroupBubbleMaxWidth(screenWidth),
    [screenWidth],
  );

  const sender = toParticipant(message);
  const displayName = displayParticipantName(sender);
  const isImage = message.message_type === 'image' && message.media_url;
  const isVideo = message.message_type === 'video' && message.media_url;
  const isMedia = Boolean(isImage || isVideo);
  const hasCaption = message.content.trim().length > 0;
  const mediaOnly = isMedia && !hasCaption;
  const textColor = isMine ? chat.outgoingText : chat.incomingText;
  const metaColor = isMine ? chat.metaOutgoing : chat.metaIncoming;

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleTheirs,
        isMedia ? styles.bubbleMedia : null,
        mediaOnly ? styles.bubbleMediaOnly : null,
        {
          backgroundColor: mediaOnly
            ? 'transparent'
            : isMine
              ? chat.outgoingBubble
              : chat.incomingBubble,
          shadowOpacity: mediaOnly ? 0 : 0.08,
          elevation: mediaOnly ? 0 : 1,
        },
        !isMine ? styles.bubbleInGroup : null,
      ]}
    >
      {!isMine && showSenderHeader ? (
        <View style={styles.senderHeader}>
          <Text variant="caption" style={[styles.senderName, { color: chat.replyAccent }]}>
            {message.is_staff ? 'Destek Ekibi' : displayName}
          </Text>
          {message.sender_username ? (
            <Text variant="caption" style={[styles.senderMeta, { color: metaColor }]}>
              @{message.sender_username}
              {message.is_staff && message.sender_full_name
                ? ` · ${message.sender_full_name}`
                : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isImage ? <ChatMediaAttachment uri={message.media_url!} /> : null}
      {isVideo ? <ChatVideoAttachment uri={message.media_url!} /> : null}

      {hasCaption ? (
        <Text style={[styles.messageText, { color: textColor }]}>{message.content}</Text>
      ) : null}

      <View style={styles.metaRow}>
        {message.is_staff && !isMine ? (
          <View style={[styles.staffBadge, { backgroundColor: `${LIVE_SUPPORT_ACCENT}22` }]}>
            <Ionicons name="headset-outline" size={10} color={LIVE_SUPPORT_ACCENT} />
            <Text variant="caption" style={{ color: LIVE_SUPPORT_ACCENT, fontSize: 10, fontWeight: '700' }}>
              Destek
            </Text>
          </View>
        ) : null}
        <Text style={[styles.metaText, { color: metaColor }]}>{formatMessageTime(message.created_at)}</Text>
      </View>
    </View>
  );

  if (isMine) {
    return (
      <View style={[styles.row, styles.rowMine, { marginBottom }]}>
        {bubbleContent}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowTheirs, { marginBottom }]}>
      <View style={styles.incomingWrap}>
        <View style={styles.incomingRow}>
          <ChatSenderAvatar sender={sender} senderId={message.sender_id} visible={showSenderAvatar} />
          <View style={[styles.bubbleColumn, { maxWidth: groupBubbleMaxWidth }]}>{bubbleContent}</View>
        </View>
      </View>
    </View>
  );
});

export function liveSupportBubbleMargin(
  current: LiveSupportMessage,
  next?: LiveSupportMessage,
): number {
  if (!next) return CHAT_SENDER_GAP;
  return next.sender_id === current.sender_id ? CHAT_BUBBLE_GAP : CHAT_SENDER_GAP;
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    paddingHorizontal: CHAT_LIST_HORIZONTAL_PAD,
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  rowTheirs: {
    alignItems: 'flex-start',
  },
  incomingWrap: {
    width: '100%',
    maxWidth: '100%',
  },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: '100%',
    gap: CHAT_SENDER_AVATAR_GAP,
  },
  bubbleColumn: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CHAT_BUBBLE_RADIUS + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
  },
  bubbleInGroup: {
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  bubbleMedia: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  bubbleMediaOnly: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  senderHeader: {
    gap: 1,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
  },
  senderMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 13,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
