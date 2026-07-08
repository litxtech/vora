import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useChatTheme } from '../hooks/useChatTheme';
import { useDoubleTap } from '../hooks/useDoubleTap';
import {
  CHAT_BUBBLE_GAP,
  CHAT_BUBBLE_RADIUS,
  CHAT_SENDER_AVATAR_GAP,
  CHAT_SENDER_GAP,
  chatGroupBubbleMaxWidth,
} from '../constants';
import type { ChatMessage } from '../types';
import { isHiddenPublicAccount } from '@/features/account-deletion/utils';
import { openUrl } from '@/lib/linking/openUrl';
import { displayParticipantName, formatChatLocationAddress, formatMessageTime, formatReplyPreview, parseFileContent, parseLocationContent } from '../utils';
import { shouldShowQueuedVideoOverlay } from '../utils/reconcilePendingMessages';
import { openChatLocationMap } from '../services/locationNavigation';
import { ChatMediaAttachment } from './ChatMediaAttachment';
import { ChatEphemeralMedia } from './ChatEphemeralMedia';
import { ChatEphemeralExpiredNotice } from './ChatEphemeralExpiredNotice';
import { isEphemeralMediaMessage } from '../services/ephemeralImage';
import { ChatSharedCard } from './ChatSharedCard';
import { ChatCallLog } from './ChatCallLog';
import { ChatHeyetDecisionCard } from '@/features/heyet/components/ChatHeyetDecisionCard';
import { parseCallLogMetadata } from '../services/callLogMetadata';
import { isStoryReplyMessage } from '../services/storyReplyMetadata';
import { ChatStoryReplyCard } from './ChatStoryReplyCard';
import { ChatVideoAttachment } from './ChatVideoAttachment';
import { CHAT_SENDER_AVATAR_SIZE, ChatSenderAvatar } from './ChatSenderAvatar';
import { ChatMessageText } from './ChatMessageText';
import { ChatLinkPreview } from './ChatLinkPreview';
import { ChatVoiceMessage } from './ChatVoiceMessage';
import { useLinkPreview } from '../hooks/useLinkPreview';
import { firstUrlInText } from '../utils/messageTextSegments';

type ChatBubbleProps = {
  message: ChatMessage;
  isMine: boolean;
  isGroup?: boolean;
  showSenderAvatar?: boolean;
  isFiltered?: boolean;
  isHighlighted?: boolean;
  /** Altındaki mesajla aralık — renderMessage hesaplar */
  marginBottom?: number;
  onLongPress?: () => void;
  onDoublePress?: () => void;
  onCopy?: () => void;
  onQuotePress?: () => void;
  onReactionPress?: (emoji: string) => void;
  onEphemeralExpired?: (messageId: string) => void;
  onEphemeralViewed?: (messageId: string, viewedAtMs: number) => void;
  ephemeralViewedAtByMessageId?: Record<string, number>;
};

function StatusIcon({ status, readColor }: { status?: ChatMessage['localStatus']; readColor: string }) {
  if (!status || status === 'sending') {
    return <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.55)" />;
  }
  if (status === 'failed') {
    return <Ionicons name="alert-circle-outline" size={13} color="#FCA5A5" />;
  }
  if (status === 'read') {
    return <Ionicons name="checkmark-done" size={13} color={readColor} />;
  }
  if (status === 'delivered') {
    return <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.55)" />;
  }
  return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.55)" />;
}

function ChatLocation({
  content,
  isMine,
  labelColor,
  metaColor,
  sharedAt,
  senderName,
}: {
  content: string;
  isMine: boolean;
  labelColor: string;
  metaColor: string;
  sharedAt?: string;
  senderName?: string;
}) {
  const { colors } = useTheme();
  const location = parseLocationContent(content);
  if (!location) return <Text style={{ color: labelColor }}>Konum</Text>;

  const title = location.label ?? formatChatLocationAddress(location);
  const subtitle = formatChatLocationAddress(location);

  return (
    <Pressable
      style={[styles.locationRow, { backgroundColor: isMine ? 'rgba(255,255,255,0.08)' : `${colors.primary}10` }]}
      onPress={() =>
        openChatLocationMap(location, {
          sharedAt,
          senderName,
        })
      }
    >
      <View style={[styles.locationIcon, { backgroundColor: isMine ? 'rgba(255,255,255,0.16)' : `${colors.primary}18` }]}>
        <Ionicons name="location" size={22} color={isMine ? '#fff' : colors.primary} />
      </View>
      <View style={styles.locationText}>
        <Text style={{ color: labelColor, fontWeight: '600' }} numberOfLines={2}>
          {title}
        </Text>
        {subtitle !== title ? (
          <Text variant="caption" style={{ color: metaColor }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        <Text variant="caption" style={{ color: metaColor }}>
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · Haritada aç
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={metaColor} />
    </Pressable>
  );
}

function ChatFile({ content, mediaUrl, isMine, labelColor }: { content: string; mediaUrl: string | null; isMine: boolean; labelColor: string }) {
  const { colors } = useTheme();
  const file = parseFileContent(content);
  return (
    <Pressable style={styles.fileRow} onPress={() => mediaUrl && void openUrl(mediaUrl)}>
      <Ionicons name="document-attach" size={26} color={isMine ? '#fff' : colors.primary} />
      <Text style={{ color: labelColor }} numberOfLines={2}>
        {file?.name ?? 'Dosya'}
      </Text>
    </Pressable>
  );
}

function TextMessageBody({
  content,
  editedAt,
  createdAt,
  isMine,
  localStatus,
  textColor,
  metaColor,
  readColor,
  linkColor,
  accentColor,
}: {
  content: string;
  editedAt: string | null;
  createdAt: string;
  isMine: boolean;
  localStatus?: ChatMessage['localStatus'];
  textColor: string;
  metaColor: string;
  readColor: string;
  linkColor: string;
  accentColor: string;
}) {
  const time = formatMessageTime(createdAt);
  const previewUrl = useMemo(() => firstUrlInText(content), [content]);
  const { preview } = useLinkPreview(previewUrl);

  return (
    <View style={styles.textBlock}>
      {preview ? (
        <ChatLinkPreview
          preview={preview}
          isMine={isMine}
          accentColor={accentColor}
          metaColor={metaColor}
          textColor={textColor}
        />
      ) : null}
      <ChatMessageText content={content} textColor={textColor} linkColor={linkColor} />
      <View style={styles.metaRow}>
        {editedAt ? (
          <Text style={[styles.metaText, { color: metaColor }]}>düzenlendi </Text>
        ) : null}
        <Text style={[styles.metaText, { color: metaColor }]}>{time}</Text>
        {isMine ? <StatusIcon status={localStatus} readColor={readColor} /> : null}
      </View>
    </View>
  );
}

export const ChatBubble = memo(function ChatBubble({
  message,
  isMine,
  isGroup = false,
  showSenderAvatar = false,
  isFiltered = false,
  isHighlighted = false,
  marginBottom = CHAT_BUBBLE_GAP,
  onLongPress,
  onDoublePress,
  onCopy,
  onQuotePress,
  onReactionPress,
  onEphemeralExpired,
  onEphemeralViewed,
  ephemeralViewedAtByMessageId,
}: ChatBubbleProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const chat = useChatTheme();
  const { width: screenWidth } = useWindowDimensions();
  const groupBubbleMaxWidth = useMemo(
    () => chatGroupBubbleMaxWidth(screenWidth),
    [screenWidth],
  );
  const canQuote = !message.deletedForAll && Boolean(onDoublePress);
  const canCopy = Boolean(onCopy);
  const handleBubblePress = useDoubleTap({
    onSingleTap: canCopy ? onCopy : undefined,
    onDoubleTap: canQuote ? onDoublePress : undefined,
  });
  const textColor = isMine ? chat.outgoingText : chat.incomingText;
  const metaColor = isMine ? chat.metaOutgoing : chat.metaIncoming;
  const phoneLinkColor = isMine ? '#D4EEFF' : colors.primary;
  const isStoryReply = isStoryReplyMessage(message);
  const isText =
    message.messageType === 'text' && !message.deletedForAll && !isStoryReply;
  const isAudioMessage = message.messageType === 'audio';
  const isMediaMessage = message.messageType === 'image' || message.messageType === 'video';
  const hasMediaCaption = isMediaMessage && message.content.trim().length > 0;
  const hasMediaExtra =
    hasMediaCaption ||
    Boolean(message.replyTo || message.replyToId || message.forwardedFromId);
  const mediaOnly = isMediaMessage && !hasMediaExtra;
  const isReelShare = message.messageType === 'shared_reel';
  const isCallLog = message.messageType === 'call';
  const callLogMeta = isCallLog ? parseCallLogMetadata(message.metadata) : null;
  const metaRecord = message.metadata as Record<string, unknown> | null | undefined;
  const heyetDecisionMeta = metaRecord?.kind === 'heyet_decision' ? metaRecord : null;
  const isHeyetDecision = Boolean(heyetDecisionMeta) || message.content.startsWith('📋 Heyet Kararı');
  const callPeerUserId =
    callLogMeta && user?.id
      ? user.id === callLogMeta.callerId
        ? callLogMeta.calleeId
        : callLogMeta.callerId
      : null;
  const contentVisible = !message.deletedForAll;
  const isEphemeralMedia = isEphemeralMediaMessage(message);

  if (isFiltered) {
    return (
      <View style={[styles.row, styles.rowTheirs, { marginBottom }]} collapsable={false}>
        {isGroup && !isMine ? (
          <View style={styles.incomingWrap}>
            <View style={styles.incomingRow}>
              <ChatSenderAvatar
                sender={message.sender}
                senderId={message.senderId}
                visible={showSenderAvatar}
              />
              <View style={[styles.bubbleColumn, { maxWidth: groupBubbleMaxWidth }]}>
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleTheirs,
                    styles.filtered,
                    styles.bubbleInGroup,
                    { backgroundColor: chat.incomingBubble },
                  ]}
                >
                  <Text variant="caption" secondary>
                    Kısıtlanmış kullanıcıdan mesaj (gizlendi)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, styles.bubbleTheirs, styles.filtered, { backgroundColor: chat.incomingBubble }]}>
            <Text variant="caption" secondary>
              Kısıtlanmış kullanıcıdan mesaj (gizlendi)
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (isHeyetDecision && !message.deletedForAll) {
    const decisionText =
      (typeof heyetDecisionMeta?.decision_text === 'string' && heyetDecisionMeta.decision_text) ||
      message.content.replace(/^📋 Heyet Kararı\s*\n*\n*/u, '').trim() ||
      message.content;
    const closedAfter = heyetDecisionMeta?.closed_after !== false;
    const senderName = message.sender ? displayParticipantName(message.sender) : null;

    return (
      <View style={[styles.row, styles.rowHeyetDecision, { marginBottom }]} collapsable={false}>
        <ChatHeyetDecisionCard
          decisionText={decisionText}
          createdAt={message.createdAt}
          closedAfter={closedAfter}
          senderName={senderName}
        />
      </View>
    );
  }

  const showAvatar = isGroup && !isMine;

  if (message.deletedForAll) {
    const deletedNotice = isEphemeralMedia ? (
      <ChatEphemeralExpiredNotice isMine={isMine} title="Süresi bitti" note="Silindi" icon="hourglass-outline" />
    ) : (
      <ChatEphemeralExpiredNotice isMine={isMine} title="Bu mesaj silindi" note={null} icon="trash-outline" />
    );

    return (
      <View
        style={[
          styles.row,
          isMine ? styles.rowMine : styles.rowTheirs,
          styles.rowEphemeralExpired,
          { marginBottom: marginBottom + spacing.sm },
        ]}
        collapsable={false}
      >
        {showAvatar ? (
          <View style={styles.incomingWrap}>
            <View style={styles.incomingRow}>
              <ChatSenderAvatar
                sender={message.sender}
                senderId={message.senderId}
                visible={showSenderAvatar}
              />
              {deletedNotice}
            </View>
          </View>
        ) : (
          deletedNotice
        )}
      </View>
    );
  }

  const senderLabel = message.sender ? displayParticipantName(message.sender) : null;
  const senderHidden = isHiddenPublicAccount(message.sender?.account_status);

  const bubbleContent = (
    <Pressable
      style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleTheirs,
        isMediaMessage ? styles.bubbleMedia : null,
        mediaOnly ? styles.bubbleMediaOnly : null,
        isReelShare ? styles.bubbleReelShare : null,
        isStoryReply ? styles.bubbleReelShare : null,
        isCallLog ? styles.bubbleCallLog : null,
        {
          backgroundColor:
            isReelShare || isStoryReply || isCallLog || mediaOnly
              ? 'transparent'
              : isMine
                ? chat.outgoingBubble
                : chat.incomingBubble,
          shadowOpacity: isReelShare || isStoryReply || isCallLog || mediaOnly ? 0 : 0.08,
          elevation: isReelShare || isStoryReply || isCallLog || mediaOnly ? 0 : 1,
        },
        showAvatar ? styles.bubbleInGroup : null,
      ]}
      onLongPress={message.messageType === 'video' ? undefined : onLongPress}
      onPress={
        !isAudioMessage && (canCopy || canQuote) ? handleBubblePress : undefined
      }
    >
        {isGroup && !isMine && senderLabel ? (
          <Text
            variant="caption"
            style={[
              {
                color: senderHidden ? colors.danger : chat.replyAccent,
                marginBottom: 2,
                fontSize: 12,
                fontWeight: '600',
              },
              isMediaMessage && hasMediaExtra ? styles.mediaBubbleInsetTop : null,
            ]}
          >
            {senderLabel}
          </Text>
        ) : null}

        {!isMine && senderHidden ? (
          <Text variant="caption" style={{ color: colors.danger, marginBottom: 4 }}>
            Bu kullanıcı artık mevcut değil. Mesaj geçmişi korunmuştur.
          </Text>
        ) : null}

        {message.forwardedFromId ? (
          <View style={[styles.forwardBar, isMediaMessage ? styles.mediaBubbleInset : null]}>
            <Ionicons name="arrow-redo" size={12} color={metaColor} />
            <Text variant="caption" style={{ color: metaColor }}>
              İletildi
              {message.forwardedFrom?.sender
                ? ` — ${displayParticipantName(message.forwardedFrom.sender)}`
                : ''}
            </Text>
          </View>
        ) : null}

        {message.replyTo ? (
          <Pressable
            style={[
              styles.reply,
              isMediaMessage ? styles.mediaBubbleInset : null,
              { borderLeftColor: isMine ? chat.accentRead : chat.replyAccent },
            ]}
            onPress={onQuotePress}
          >
            <Text variant="caption" style={{ color: isMine ? chat.accentRead : chat.replyAccent, fontWeight: '600' }}>
              {message.replyTo.sender?.full_name ?? message.replyTo.sender?.username ?? 'Kullanıcı'}
            </Text>
            <Text variant="caption" style={{ color: metaColor }} numberOfLines={2}>
              {formatReplyPreview(message.replyTo)}
            </Text>
          </Pressable>
        ) : message.replyToId ? (
          <View
            style={[
              styles.reply,
              styles.replyPlaceholder,
              isMediaMessage ? styles.mediaBubbleInset : null,
              { borderLeftColor: isMine ? chat.accentRead : chat.replyAccent },
            ]}
          >
            <Text variant="caption" style={{ color: metaColor }} numberOfLines={2}>
              Alıntılanan mesaj
            </Text>
          </View>
        ) : null}

        {contentVisible && message.messageType === 'image' && (message.mediaUrl || message.localMediaUri) ? (
          isEphemeralMedia ? (
            <ChatEphemeralMedia
              message={message}
              viewerId={user?.id}
              isMine={isMine}
              viewedAtMs={ephemeralViewedAtByMessageId?.[message.id]}
              onViewed={onEphemeralViewed}
              onMessageExpired={onEphemeralExpired}
            />
          ) : (
            <ChatMediaAttachment
              uri={message.mediaUrl}
              onDoublePress={canQuote ? onDoublePress : undefined}
            />
          )
        ) : null}
        {contentVisible && message.messageType === 'video' && message.mediaUrl ? (
          isEphemeralMedia && message.localStatus !== 'sending' && !shouldShowQueuedVideoOverlay(message) ? (
            <ChatEphemeralMedia
              message={message}
              viewerId={user?.id}
              isMine={isMine}
              viewedAtMs={ephemeralViewedAtByMessageId?.[message.id]}
              onViewed={onEphemeralViewed}
              onMessageExpired={onEphemeralExpired}
            />
          ) : (
            <ChatVideoAttachment
              uri={message.mediaUrl}
              localMediaUri={message.localMediaUri}
              uploadStage={message.uploadStage}
              uploadProgress={message.uploadProgress}
              uploadEtaSec={message.uploadEtaSec}
              isUploading={message.localStatus === 'sending' && Boolean(message.uploadStage)}
              isQueued={shouldShowQueuedVideoOverlay(message)}
              onLongPress={onLongPress}
              onDoublePress={canQuote ? onDoublePress : undefined}
            />
          )
        ) : null}
        {contentVisible && isAudioMessage && message.mediaUrl ? (
          <ChatVoiceMessage
            uri={message.localMediaUri ?? message.mediaUrl}
            content={message.content}
            isMine={isMine}
            seed={message.id}
            accentColor={colors.primary}
            textColor={textColor}
            metaColor={metaColor}
          />
        ) : null}
        {contentVisible && message.messageType === 'location' ? (
          <ChatLocation
            content={message.content}
            isMine={isMine}
            labelColor={textColor}
            metaColor={metaColor}
            sharedAt={message.createdAt}
            senderName={message.sender ? displayParticipantName(message.sender) : undefined}
          />
        ) : null}
        {contentVisible && isCallLog && callLogMeta && callPeerUserId ? (
          <ChatCallLog
            metadata={callLogMeta}
            content={message.content}
            metaColor={metaColor}
            primaryColor={colors.primary}
            peerUserId={callPeerUserId}
            isOutgoing={user?.id === callLogMeta.callerId}
          />
        ) : null}
        {contentVisible && message.messageType === 'file' ? (
          <ChatFile content={message.content} mediaUrl={message.mediaUrl} isMine={isMine} labelColor={textColor} />
        ) : null}

        {contentVisible && isStoryReply ? (
          <ChatStoryReplyCard
            message={message}
            isMine={isMine}
            textColor={textColor}
            metaColor={metaColor}
            bubbleBackground={isMine ? chat.outgoingBubble : chat.incomingBubble}
          />
        ) : null}

        {contentVisible &&
        (message.messageType === 'shared_post' ||
          message.messageType === 'shared_reel' ||
          message.messageType === 'shared_profile' ||
          message.messageType === 'shared_marketplace_listing' ||
          message.messageType === 'shared_job_listing' ||
          message.messageType === 'shared_staff_listing' ||
          message.messageType === 'shared_vora_need') ? (
          <ChatSharedCard
            message={message}
            isMine={isMine}
            textColor={textColor}
            metaColor={metaColor}
            primaryColor={colors.primary}
            viewerId={user?.id ?? null}
          />
        ) : null}

        {message.content && isText && !isHeyetDecision ? (
          <TextMessageBody
            content={message.content}
            editedAt={message.editedAt}
            createdAt={message.createdAt}
            isMine={isMine}
            localStatus={message.localStatus}
            textColor={textColor}
            metaColor={metaColor}
            readColor={chat.accentRead}
            linkColor={phoneLinkColor}
            accentColor={isMine ? chat.accentRead : chat.replyAccent}
          />
        ) : null}

        {message.queued && message.localStatus === 'failed' ? (
          <Text variant="caption" style={{ color: '#FCA5A5', marginTop: 4 }}>
            Gönderilemedi · basılı tut
          </Text>
        ) : message.queued && message.messageType !== 'video' ? (
          <Text variant="caption" style={{ color: metaColor }}>
            Gönderilmeyi bekliyor...
          </Text>
        ) : null}

        {!isText && !isAudioMessage ? (
          <View style={[styles.metaRow, isMediaMessage && !mediaOnly ? styles.mediaBubbleInset : null]}>
            {message.editedAt ? (
              <Text style={[styles.metaText, { color: metaColor }]}>düzenlendi </Text>
            ) : null}
            <Text style={[styles.metaText, { color: metaColor }]}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isMine ? <StatusIcon status={message.localStatus} readColor={chat.accentRead} /> : null}
          </View>
        ) : null}

        {!isText && isAudioMessage ? (
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: metaColor }]}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isMine ? <StatusIcon status={message.localStatus} readColor={chat.accentRead} /> : null}
          </View>
        ) : null}
      </Pressable>
  );

  const reactionsBlock =
    message.reactions && message.reactions.length > 0 ? (
      <View
        style={[
          styles.reactionsRow,
          isMine ? styles.reactionsMine : styles.reactionsTheirs,
          showAvatar ? styles.reactionsWithAvatar : null,
        ]}
      >
        {message.reactions.map((r) => (
          <Pressable
            key={r.emoji}
            style={[
              styles.reactionChip,
              {
                backgroundColor: r.reactedByMe ? `${colors.primary}22` : colors.surfaceElevated,
                borderColor: r.reactedByMe ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onReactionPress?.(r.emoji)}
          >
            <Text>{r.emoji}</Text>
            <Text variant="caption">{r.count}</Text>
          </Pressable>
        ))}
      </View>
    ) : null;

  return (
    <View
      style={[
        styles.row,
        isMine ? styles.rowMine : styles.rowTheirs,
        isHighlighted ? styles.highlighted : null,
        { marginBottom },
      ]}
      collapsable={false}
    >
      {showAvatar ? (
        <View style={styles.incomingWrap}>
          <View style={styles.incomingRow}>
            <ChatSenderAvatar
              sender={message.sender}
              senderId={message.senderId}
              visible={showSenderAvatar}
            />
            <View style={[styles.bubbleColumn, { maxWidth: groupBubbleMaxWidth }]}>
              {bubbleContent}
            </View>
          </View>
          {reactionsBlock}
        </View>
      ) : (
        <>
          {bubbleContent}
          {reactionsBlock}
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  rowTheirs: {
    alignItems: 'flex-start',
  },
  rowHeyetDecision: {
    alignItems: 'center',
  },
  rowEphemeralExpired: {
    marginTop: spacing.xs,
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
  highlighted: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: radius.md,
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
    backgroundColor: undefined,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: undefined,
    borderBottomLeftRadius: 4,
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
  mediaBubbleInset: {
    paddingHorizontal: 12,
  },
  mediaBubbleInsetTop: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bubbleReelShare: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
    elevation: 0,
    maxWidth: '85%',
  },
  bubbleCallLog: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
    elevation: 0,
    maxWidth: '88%',
    alignSelf: 'center',
  },
  bubbleInGroup: {
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  filtered: { opacity: 0.7 },
  forwardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  reply: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginBottom: 4,
  },
  replyPlaceholder: {
    minHeight: 36,
    justifyContent: 'center',
    opacity: 0.75,
  },
  textBlock: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    gap: 3,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 220,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 160,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
    maxWidth: '75%',
  },
  reactionsMine: { alignSelf: 'flex-end' },
  reactionsTheirs: { alignSelf: 'flex-start' },
  reactionsWithAvatar: {
    marginLeft: CHAT_SENDER_AVATAR_SIZE + CHAT_SENDER_AVATAR_GAP,
    marginTop: 4,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
