import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { safeSetAudioModeAsync } from '@/lib/audio/safeAudioMode';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { canAdmin } from '@/constants/roles';
import { HeyetAdminBar } from '@/features/heyet/components/HeyetAdminBar';
import { HeyetChatBanner } from '@/features/heyet/components/HeyetChatBanner';
import { IzdivacChatBanner } from '@/features/izdivac/components/IzdivacChatBanner';
import { fetchHeyetCaseForConversation } from '@/features/heyet/services/heyetData';
import type { HeyetCase } from '@/features/heyet/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps, getChatInitialRenderCount, getChatReadMarkIntervalMs, shouldAnimateChatBubbles } from '@/lib/device/androidPerfProfile';
import { supabase } from '@/lib/supabase/client';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { useChatBackgroundSync } from '../hooks/useChatBackgroundSync';
import { useChatInboxBridge } from '../hooks/useChatInboxBridge';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { fetchConversationDetail } from '../services/conversationData';
import {
  awaitConversationOpenPrefetch,
  readConversationOpenSnapshot,
} from '../services/conversationOpenPrefetch';
import {
  flushPersistedMessages,
  readPersistedMessages,
  schedulePersistMessages,
} from '../services/messageDiskCache';
import { fetchParticipantPresence } from '../services/presence';
import {
  deleteMessageForAll,
  deleteMessageForMe,
  editMessage,
  fetchMessages,
  fetchMessagesAfter,
  markConversationRead,
  resolveOutgoingDeliveryStatus,
  sendMessage,
} from '../services/messageData';
import { fetchMessageHydration } from '../services/messageHydration';
import {
  estimateInitialVideoEtaSec,
  uploadMessageVideo,
} from '../services/messageVideoUpload';
import { uploadMessageMedia } from '../services/messageMediaUpload';
import type { ChatMessage, ConversationDetail } from '../types';
import {
  buildLocationPayloadFromGeocode,
  displayParticipantName,
  formatActivityLabel,
  formatChatLocationAddress,
  minimalConversationDetail,
} from '../utils';
import { showChatMenuActions } from '../utils/conversationActions';
import {
  clearConversationHistory,
  deleteConversationForUser,
  showConversation,
} from '../services/inboxActions';
import { blockUser, unblockUser } from '@/features/feed/services/engagement';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { isUserRestrictedBy } from '@/features/moderation/services/interactions';
import { fetchDirectBlockStatus, type DirectBlockStatus } from '@/features/moderation/services/blockStatus';
import { alertBlockError, isBlockedByUserError } from '@/features/moderation/utils/blockErrors';
import { useMessageQueue } from '../hooks/useMessageQueue';
import { enqueueMessage, getQueuedMessages, removeQueuedMessage } from '../services/messageQueue';
import { removePendingFromQueue, retryQueuedMessage } from '../services/queuedMessageActions';
import { fetchMessageReactions, REACTION_EMOJIS, toggleReaction } from '../services/reactionData';
import type { MessageReaction } from '../services/reactionData';
import type { MessageReactionSummary } from '../types';
import { copyMessages } from '../utils/messageCopy';
import { incomingRowToChatMessage } from '../utils/inboxUpdates';
import {
  enrichIncomingMessage,
  messageNeedsRemoteHydration,
  resolveGroupMessageSender,
} from '../utils/enrichIncomingMessage';
import {
  isPendingOutgoingMessage,
  mapQueuedToChatMessage,
  maxServerMessageCreatedAt,
} from '../utils/pendingMessage';
import {
  isRedundantPendingMessage,
  matchesQueuedToServer,
  mergeMessagesForConversationLoad,
} from '../utils/reconcilePendingMessages';
import {
  applyReactionPatches,
  mergeSyncedMessages,
  messageListRenderKey,
} from '../utils/mergeSyncedMessages';
import { capMessageList } from '../utils/messageWindow';
import { buildVoiceMessageContent } from '../utils/voiceMessage';
import { persistVideoForQueue } from '@/lib/video/prepareLocalVideo';
import { ChatBubble } from './ChatBubble';
import { ChatBubbleEntrance } from './ChatBubbleEntrance';
import { ChatComposer, type ChatComposerHandle } from './ChatComposer';
import { ChatQuickCapture } from './ChatQuickCapture';
import { ChatImageSendConfirm } from './ChatImageSendConfirm';
import { ChatHeader } from './ChatHeader';
import { ChatMediaGallery } from './ChatMediaGallery';
import { ChatSearchSheet } from './ChatSearchSheet';
import { ChatSelectionBar } from './ChatSelectionBar';
import { ForwardSheet } from './ForwardSheet';
import {
  CHAT_BUBBLE_GAP,
  CHAT_LIST_HORIZONTAL_PAD,
  CHAT_MAX_IMAGES_PER_SEND,
  CHAT_EPHEMERAL_DEFAULT_DURATION_SEC,
  CHAT_SENDER_GAP,
  CHAT_VIDEO_MAX_DURATION_SEC,
} from '../constants';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { useMessageDrafts } from '../hooks/useMessageDrafts';
import { useChatTheme } from '../hooks/useChatTheme';
import { getMessageDraft, setMessageDraft } from '../services/messageDrafts';
import { useMessagingStore } from '../store/messagingStore';
import { ChatBackground } from './ChatBackground';
import { ChatConversationLayout } from './ChatConversationLayout';
import { useChatMediaViewer } from '../context/ChatMediaViewerContext';
import { buildEphemeralImageMetadata } from '../services/ephemeralImage';
import { useEphemeralMessageExpiry } from '../hooks/useEphemeralMessageExpiry';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '../featureFlags';

const PAGE_SIZE = 50;

function bubbleMarginBeforeNext(current: ChatMessage, next: ChatMessage | undefined): number {
  if (!next) return 0;
  return next.senderId === current.senderId ? CHAT_BUBBLE_GAP : CHAT_SENDER_GAP;
}

function createLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeReactions(
  reactions: MessageReaction[],
  userId: string,
): MessageReactionSummary[] {
  const map = new Map<string, MessageReactionSummary>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, reactedByMe: false };
    existing.count += 1;
    if (r.userId === userId) existing.reactedByMe = true;
    map.set(r.emoji, existing);
  }
  return [...map.values()];
}

async function attachReactions(messages: ChatMessage[], userId: string): Promise<ChatMessage[]> {
  const ids = messages.map((m) => m.id).filter((id) => !id.startsWith('local-') && !id.startsWith('queue-'));
  if (ids.length === 0) return messages;
  try {
    const grouped = await fetchMessageReactions(ids);
    return messages.map((m) => ({
      ...m,
      reactions: grouped[m.id] ? summarizeReactions(grouped[m.id], userId) : m.reactions,
    }));
  } catch {
    return messages;
  }
}

function applyReadStatus(
  messages: ChatMessage[],
  otherLastReadAt: string | null,
  currentUserId: string,
): ChatMessage[] {
  if (!otherLastReadAt) return messages;
  return messages.map((m) => {
    if (m.senderId !== currentUserId || m.localOnly) return m;
    if (m.createdAt <= otherLastReadAt) {
      return { ...m, localStatus: 'read' as const };
    }
    return m;
  });
}

export function ChatScreen() {
  const params = useLocalSearchParams<{ id: string | string[]; from?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const fromIzdivac = (Array.isArray(params.from) ? params.from[0] : params.from) === 'izdivac';
  const { user, profile, isLoading: authLoading } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { colors } = useTheme();
  const chat = useChatTheme();
  const { openMedia } = useChatMediaViewer();
  useMessageDrafts(user?.id);
  const showAttachPhoto = useFeatureVisible(MESSAGING_FEATURE.attachPhoto);
  const showAttachVideo = useFeatureVisible(MESSAGING_FEATURE.attachVideo);
  const showAttachFile = useFeatureVisible(MESSAGING_FEATURE.attachFile);
  const showAttachLocation = useFeatureVisible(MESSAGING_FEATURE.attachLocation);
  const showMsgQuote = useFeatureVisible(MESSAGING_FEATURE.msgQuote);
  const showMsgReact = useFeatureVisible(MESSAGING_FEATURE.msgReact);
  const showMsgForward = useFeatureVisible(MESSAGING_FEATURE.msgForward);
  const showMsgCopy = useFeatureVisible(MESSAGING_FEATURE.msgCopy);
  const showMsgSelect = useFeatureVisible(MESSAGING_FEATURE.msgSelect);
  const showMsgEdit = useFeatureVisible(MESSAGING_FEATURE.msgEdit);
  const showMsgReport = useFeatureVisible(MESSAGING_FEATURE.msgReport);
  const showMsgDeleteMe = useFeatureVisible(MESSAGING_FEATURE.msgDeleteMe);
  const showMsgDeleteAll = useFeatureVisible(MESSAGING_FEATURE.msgDeleteAll);
  const showPendingRetry = useFeatureVisible(MESSAGING_FEATURE.pendingRetry);
  const showPendingCancel = useFeatureVisible(MESSAGING_FEATURE.pendingCancel);
  const showPendingDelete = useFeatureVisible(MESSAGING_FEATURE.pendingDelete);
  const conversationDraft = useMessagingStore((s) => (id ? s.draftByConversationId[id] ?? '' : ''));
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const composerRef = useRef<ChatComposerHandle>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollMessageIdRef = useRef<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [detailResolved, setDetailResolved] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [otherUserRestricted, setOtherUserRestricted] = useState(false);
  const [blockStatus, setBlockStatus] = useState<DirectBlockStatus | null>(null);
  const [heyetCase, setHeyetCase] = useState<HeyetCase | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<{ uri: string; durationSec: number } | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [quickCaptureVisible, setQuickCaptureVisible] = useState(false);
  const [quickSnapEphemeral, setQuickSnapEphemeral] = useState(true);
  const [imageSendConfirm, setImageSendConfirm] = useState<{
    uris: string[];
    ephemeral: boolean;
  } | null>(null);
  const [ephemeralViewedAt, setEphemeralViewedAt] = useState<Record<string, number>>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardMessages, setForwardMessages] = useState<ChatMessage[]>([]);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    messageType: 'image' | 'video';
    assets: ImagePicker.ImagePickerAsset[];
  } | null>(null);
  const otherLastReadAtRef = useRef<string | null>(null);
  const readChannelGenRef = useRef(0);
  const presenceChannelGenRef = useRef(0);
  const screenFocusedRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  const conversationRef = useRef<ConversationDetail | null>(null);
  const hydratingMessageIdsRef = useRef(new Set<string>());
  const activeConversationIdRef = useRef<string | undefined>(id);
  const syncNewMessagesRef = useRef<(() => Promise<void>) | null>(null);
  const syncInFlightRef = useRef(false);
  const syncPendingRef = useRef(false);
  const enteredMessageIdsRef = useRef(new Set<string>());
  messagesRef.current = messages;
  conversationRef.current = conversation;
  activeConversationIdRef.current = id;

  const { scrollToBottom, pinToBottom, handleScroll } = useChatAutoScroll(messages, flatListRef, true);
  const hasPendingVoice = pendingVoice !== null;

  useEffect(() => {
    if (recorderState.isRecording || hasPendingVoice) {
      pinToBottom();
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    }
  }, [recorderState.isRecording, hasPendingVoice, pinToBottom, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  const handleOpenAttachmentPreview = useCallback(
    (uri: string, type: 'image' | 'video') => {
      openMedia(uri, { isVideo: type === 'video' });
    },
    [openMedia],
  );

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);
  const displayMessagesRef = useRef(displayMessages);
  displayMessagesRef.current = displayMessages;

  const markMessageEntered = useCallback((messageId: string) => {
    enteredMessageIdsRef.current.add(messageId);
  }, []);

  const markMessagesEntered = useCallback((list: ChatMessage[]) => {
    for (const message of list) {
      enteredMessageIdsRef.current.add(message.id);
    }
  }, []);

  const handleDraftChange = useCallback(
    (text: string) => {
      if (!id || !user?.id || editingMessage) return;
      setMessageDraft(user.id, id, text);
    },
    [id, user?.id, editingMessage],
  );

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    if (message.deletedForAll || message.messageType !== 'text' || !message.content.trim()) return;
    const text = await copyMessages([message]);
    if (!text) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopyToastVisible(true);
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    copyToastTimerRef.current = setTimeout(() => setCopyToastVisible(false), 1400);
  }, []);

  useEffect(
    () => () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!id) return;
    const store = useMessagingStore.getState();
    if (store.activeConversationId !== id) {
      const unread = store.getDisplayUnread(id);
      store.enterConversation(id, unread > 0 ? unread : undefined);
      if (user?.id) {
        void markConversationRead(id, user.id);
      }
    }
    return () => {
      useMessagingStore.getState().leaveConversation();
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) {
      setHeyetCase(null);
      return;
    }
    void (async () => {
      const { heyetCase: nextCase } = await fetchHeyetCaseForConversation(id);
      if (activeConversationIdRef.current !== id) return;
      setHeyetCase(nextCase);
    })();
  }, [id]);

  const refreshHeyetCase = useCallback(async () => {
    if (!id) return;
    const { heyetCase: nextCase } = await fetchHeyetCaseForConversation(id);
    if (activeConversationIdRef.current !== id) return;
    setHeyetCase(nextCase);
    await syncNewMessagesRef.current?.();
  }, [id]);

  const isAdminUser = profile?.role ? canAdmin(profile.role) : false;
  const heyetComposerLocked = heyetCase?.status === 'closed' && !isAdminUser;

  useLayoutEffect(() => {
    if (!id) return;
    enteredMessageIdsRef.current.clear();
    const snapshot = readConversationOpenSnapshot(id, user?.id);
    markMessagesEntered(snapshot.messages);
    setMessages(snapshot.messages);
    setConversation(snapshot.conversation);
    setPendingAttachment(null);
    otherLastReadAtRef.current = snapshot.otherLastReadAt;
    setHasMore(snapshot.hasMore);
    setDetailResolved(snapshot.messages.length > 0 || snapshot.conversation != null);

    if (snapshot.messages.length === 0 && user?.id) {
      void readPersistedMessages(user.id, id).then((disk) => {
        if (!disk?.length || activeConversationIdRef.current !== id) return;
        markMessagesEntered(disk);
        const capped = capMessageList(disk);
        setMessages(capped);
        setHasMore(capped.length >= PAGE_SIZE);
        setDetailResolved(true);
        useMessagingStore.getState().setCachedMessages(id, capped);
      });
    }
  }, [id, markMessagesEntered, user?.id]);

  useEffect(() => {
    if (!id) return;
    useMessagingStore.getState().setCachedMessages(id, messages);
    if (user?.id && messages.length > 0) {
      schedulePersistMessages(user.id, id, messages);
    }
  }, [id, messages, user?.id]);

  useEffect(() => {
    if (!id || !user?.id) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flushPersistedMessages(user.id!, id, messagesRef.current);
      }
    });

    return () => {
      sub.remove();
      void flushPersistedMessages(user.id, id, messagesRef.current);
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!id || !conversation || conversation.type !== 'group' || conversation.members.length === 0) {
      return;
    }

    setMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        if (message.sender) return message;
        const sender = resolveGroupMessageSender(message, conversation);
        if (!sender) return message;
        changed = true;
        return { ...message, sender };
      });
      return changed ? next : prev;
    });
  }, [id, conversation?.id, conversation?.type, conversation?.members.length]);

  useEffect(() => {
    if (!id || !conversation) return;
    useMessagingStore.getState().setCachedConversationDetail(id, conversation);
  }, [id, conversation]);

  useEffect(() => {
    if (replyTo || editingMessage) {
      pinToBottom();
      scrollToBottom();
    }
    if (editingMessage) setPendingAttachment(null);
  }, [replyTo, editingMessage, pinToBottom, scrollToBottom]);

  const load = useCallback(async (silent = false) => {
    const conversationId = id;
    if (!conversationId) {
      if (!silent) setDetailResolved(true);
      return;
    }
    if (!user?.id) {
      if (!authLoading && !silent) setDetailResolved(true);
      return;
    }

    const store = useMessagingStore.getState();

    if (store.getCachedMessages(conversationId).length === 0) {
      await awaitConversationOpenPrefetch(conversationId);
    } else {
      void awaitConversationOpenPrefetch(conversationId);
    }

    const cached = store.getCachedMessages(conversationId);
    const cachedDetail = store.getCachedConversationDetail(conversationId);

    if (cached.length > 0) {
      markMessagesEntered(cached);
      setMessages((prev) => (prev.length > 0 ? prev : capMessageList(cached)));
      setHasMore(cached.length >= PAGE_SIZE);

      if (cachedDetail) {
        otherLastReadAtRef.current = cachedDetail.otherLastReadAt;
        setConversation(cachedDetail);
      }

      if (!silent) setDetailResolved(true);
      void showConversation(conversationId);
      void markConversationRead(conversationId, user.id);
      void syncNewMessagesRef.current?.();

      if (!cachedDetail) {
        void (async () => {
          const detail = await fetchConversationDetail(conversationId, user.id);
          if (conversationId !== activeConversationIdRef.current || !detail) return;

          otherLastReadAtRef.current = detail.otherLastReadAt;
          setConversation(detail);
          store.setCachedConversationDetail(conversationId, detail);
          setMessages((prev) => applyReadStatus(prev, detail.otherLastReadAt, user.id));

          if (!detail.otherUser?.id) {
            setOtherUserRestricted(false);
            setBlockStatus(null);
            return;
          }

          const [restricted, directBlock] = await Promise.all([
            isUserRestrictedBy(user.id, detail.otherUser.id),
            fetchDirectBlockStatus(user.id, detail.otherUser.id),
          ]);
          if (conversationId !== activeConversationIdRef.current) return;
          setOtherUserRestricted(restricted);
          setBlockStatus(directBlock);
        })();
      } else if (cachedDetail.otherUser?.id) {
        void Promise.all([
          isUserRestrictedBy(user.id, cachedDetail.otherUser.id),
          fetchDirectBlockStatus(user.id, cachedDetail.otherUser.id),
        ]).then(([restricted, directBlock]) => {
          if (conversationId !== activeConversationIdRef.current) return;
          setOtherUserRestricted(restricted);
          setBlockStatus(directBlock);
        });
      } else {
        setOtherUserRestricted(false);
        setBlockStatus(null);
      }

      return;
    }

    setHasMore(true);

    let detail: ConversationDetail | null = null;
    let initialMessages: ChatMessage[] = [];

    try {
      const [fetchedDetail, fetchedMessages] = await Promise.all([
        fetchConversationDetail(conversationId, user.id),
        fetchMessages(conversationId, user.id, null, PAGE_SIZE),
      ]);
      detail = fetchedDetail;
      initialMessages = fetchedDetail
        ? applyReadStatus(fetchedMessages, fetchedDetail.otherLastReadAt, user.id)
        : fetchedMessages;
    } catch {
      initialMessages = [];
    }

    if (conversationId !== activeConversationIdRef.current) return;
    if (!detail) {
      if (!silent) setDetailResolved(true);
      return;
    }

    otherLastReadAtRef.current = detail.otherLastReadAt;
    setConversation(detail);
    store.setCachedConversationDetail(conversationId, detail);
    if (initialMessages.length > 0) {
      store.setCachedMessages(conversationId, capMessageList(initialMessages));
    }

    const queuedRaw = await getQueuedMessages(conversationId);
    const matchedIds = queuedRaw
      .filter((item) => initialMessages.some((m) => matchesQueuedToServer(item, m)))
      .map((item) => item.id);
    if (matchedIds.length > 0) {
      await Promise.all(matchedIds.map((queuedId) => removeQueuedMessage(queuedId)));
    }
    const queuedMessages = (await getQueuedMessages(conversationId)).map(mapQueuedToChatMessage);
    if (conversationId !== activeConversationIdRef.current) return;

    markMessagesEntered(initialMessages);
    markMessagesEntered(queuedMessages);
    setMessages((prev) =>
      mergeMessagesForConversationLoad(initialMessages, prev, queuedMessages),
    );
    setHasMore(initialMessages.length >= PAGE_SIZE);

    void showConversation(conversationId);
    void markConversationRead(conversationId, user.id);
    if (!silent) setDetailResolved(true);

    void (async () => {
      if (conversationId !== activeConversationIdRef.current) return;
      try {
        const withReactions = await attachReactions(initialMessages, user.id);
        if (conversationId !== activeConversationIdRef.current) return;
        setMessages((prev) => {
          const byId = new Map(withReactions.map((m) => [m.id, m]));
          return prev.map((m) => {
            const enriched = byId.get(m.id);
            return enriched?.reactions?.length ? { ...m, reactions: enriched.reactions } : m;
          });
        });
      } catch {
        // Tepkiler sonra realtime ile gelir
      }

      if (!detail?.otherUser?.id) {
        setOtherUserRestricted(false);
        setBlockStatus(null);
        return;
      }

      const [restricted, directBlock] = await Promise.all([
        isUserRestrictedBy(user.id, detail.otherUser.id),
        fetchDirectBlockStatus(user.id, detail.otherUser.id),
      ]);
      if (conversationId !== activeConversationIdRef.current) return;
      setOtherUserRestricted(restricted);
      setBlockStatus(directBlock);
    })();
  }, [id, user?.id, authLoading, markMessagesEntered]);

  const loadOlder = useCallback(async () => {
    if (!id || !user?.id || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    const oldest = messages[0];
    try {
      const older = await fetchMessages(
        id,
        user.id,
        otherLastReadAtRef.current,
        PAGE_SIZE,
        oldest.createdAt,
      );
      if (older.length === 0) {
        setHasMore(false);
      } else {
        markMessagesEntered(older);
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const unique = older.filter((m) => !existing.has(m.id));
          return capMessageList([...unique, ...prev]);
        });
        setHasMore(older.length >= PAGE_SIZE);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [id, user?.id, loadingMore, hasMore, messages, markMessagesEntered]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMessageUpdated = useCallback((patch: Partial<ChatMessage> & { id: string }) => {
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        if (m.id !== patch.id) return m;
        const merged = { ...m, ...patch };
        const unchanged =
          merged.content === m.content &&
          merged.mediaUrl === m.mediaUrl &&
          merged.deletedForAll === m.deletedForAll &&
          merged.editedAt === m.editedAt &&
          merged.isRead === m.isRead &&
          JSON.stringify(merged.metadata ?? null) === JSON.stringify(m.metadata ?? null);
        if (unchanged) return m;
        changed = true;
        return merged;
      });
      return changed ? next : prev;
    });
  }, []);

  const scheduleMessageHydration = useCallback(
    (message: ChatMessage) => {
      if (!messageNeedsRemoteHydration(message)) return;
      if (hydratingMessageIdsRef.current.has(message.id)) return;

      hydratingMessageIdsRef.current.add(message.id);
      void fetchMessageHydration(message)
        .then((patch) => {
          if (Object.keys(patch).length === 0) return;
          handleMessageUpdated({ id: message.id, ...patch });
        })
        .catch((err) => {
          if (__DEV__) console.warn('[ChatScreen] message hydration failed', err);
        })
        .finally(() => {
          hydratingMessageIdsRef.current.delete(message.id);
        });
    },
    [handleMessageUpdated],
  );

  const handleNewMessage = useCallback(
    (message: ChatMessage) => {
      const locallyEnriched = enrichIncomingMessage(message, {
        conversation: conversationRef.current,
        existingMessages: messagesRef.current,
      });

      const enriched =
        user?.id && locallyEnriched.senderId === user.id
          ? {
              ...locallyEnriched,
              localStatus: resolveOutgoingDeliveryStatus(
                locallyEnriched.createdAt,
                user.id,
                locallyEnriched.senderId,
                otherLastReadAtRef.current,
              ),
            }
          : locallyEnriched;

      let appended = false;
      setMessages((prev) => {
        if (prev.some((m) => m.id === enriched.id)) return prev;

        const withoutLocal = prev.filter(
          (m) => !(m.localOnly || m.queued) || !isRedundantPendingMessage(m, enriched),
        );

        appended = true;
        return capMessageList([...withoutLocal, enriched]);
      });

      if (appended) {
        pinToBottom();
        scheduleMessageHydration(enriched);
        if (user?.id && message.senderId !== user.id && id) {
          void markConversationRead(id, user.id);
        }
      }
    },
    [id, user?.id, pinToBottom, scheduleMessageHydration],
  );

  const handleReactionChange = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;
      try {
        const grouped = await fetchMessageReactions([messageId]);
        const reactions = grouped[messageId]
          ? summarizeReactions(grouped[messageId], user.id)
          : [];
        setMessages((prev) => {
          if (!prev.some((m) => m.id === messageId)) return prev;
          return prev.map((m) => (m.id === messageId ? { ...m, reactions } : m));
        });
      } catch {
        // ignore realtime reaction refresh errors
      }
    },
    [user?.id],
  );

  const syncNewMessages = useCallback(async () => {
    if (!id || !user?.id) return;
    if (syncInFlightRef.current) {
      syncPendingRef.current = true;
      return;
    }

    const syncCursor = maxServerMessageCreatedAt(messagesRef.current);
    if (!syncCursor) {
      const cached = useMessagingStore.getState().getCachedMessages(id);
      if (cached.length === 0) {
        void load(true);
      }
      return;
    }

    syncInFlightRef.current = true;
    try {
      const newer = await fetchMessagesAfter(
        id,
        user.id,
        otherLastReadAtRef.current,
        syncCursor,
      );
      if (newer.length === 0) return;

      let changed = false;
      setMessages((prev) => {
        const merged = mergeSyncedMessages(prev, newer);
        changed = merged.changed;
        return merged.next;
      });

      if (changed) {
        pinToBottom();
        if (newer.some((m) => m.senderId !== user.id)) {
          void markConversationRead(id, user.id);
        }
      }

      void attachReactions(newer, user.id)
        .then((withReactions) => {
          if (withReactions.length === 0) return;
          setMessages((prev) => applyReactionPatches(prev, withReactions));
        })
        .catch(() => {
          // Tepkiler sonra tekrar senkronlanır
        });
    } catch (err) {
      if (__DEV__) console.warn('[ChatScreen] syncNewMessages failed', err);
    } finally {
      syncInFlightRef.current = false;
      if (syncPendingRef.current) {
        syncPendingRef.current = false;
        void syncNewMessagesRef.current?.();
      }
    }
  }, [id, user?.id, load, pinToBottom]);

  syncNewMessagesRef.current = syncNewMessages;

  useEffect(() => {
    if (!id || !user?.id) return;
    void syncNewMessagesRef.current?.();
  }, [id, user?.id]);

  const { flush: flushMessageQueue } = useMessageQueue(user?.id, (conversationId) => {
    if (conversationId === id) void syncNewMessages();
  });

  useChatInboxBridge(id ?? null, user?.id ?? null, (row) => {
    const message = incomingRowToChatMessage(row, user?.id ?? null);
    if (message) handleNewMessage(message);
  });

  useChatRealtime({
    conversationId: id ?? null,
    currentUserId: user?.id ?? null,
    onNewMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onReactionChange: handleReactionChange,
    onSubscribed: syncNewMessages,
  });

  useChatBackgroundSync({
    enabled: Boolean(id && user?.id),
    onFocusRefresh: () => {
      if (id && user?.id) void markConversationRead(id, user.id);
      if (messagesRef.current.length > 0) {
        void syncNewMessages();
      } else {
        void load(true);
      }
    },
    onPollRefresh: syncNewMessages,
  });

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      return () => {
        screenFocusedRef.current = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!id || !user?.id) return;
      void markConversationRead(id, user.id);
      const interval = setInterval(() => {
        void markConversationRead(id, user.id);
      }, getChatReadMarkIntervalMs());
      return () => clearInterval(interval);
    }, [id, user?.id]),
  );

  useEffect(() => {
    if (!id || !conversation?.otherUser?.id) return;

    const generation = ++readChannelGenRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = `read-${id}`;

    void (async () => {
      try {
        const next = await subscribeSupabaseChannel(channelName, (ch) =>
          ch.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversation_members',
              filter: `conversation_id=eq.${id}`,
            },
            (payload) => {
              const row = payload.new as { user_id: string; last_read_at: string | null };
              if (row.user_id === conversation.otherUser?.id && row.last_read_at) {
                otherLastReadAtRef.current = row.last_read_at;
                setMessages((prev) =>
                  applyReadStatus(prev, row.last_read_at, user?.id ?? ''),
                );
              }
            },
          ),
        );

        if (cancelled || generation !== readChannelGenRef.current) {
          await supabase.removeChannel(next);
          return;
        }

        channel = next;
      } catch {
        // stale subscribe attempt
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [id, conversation?.otherUser?.id, user?.id]);

  useEffect(() => {
    const otherId = conversation?.otherUser?.id;
    if (!otherId) return;

    const generation = ++presenceChannelGenRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = `presence-${otherId}`;

    const applyPresence = (row: {
      last_seen_at: string | null;
      is_online: boolean | null;
      last_active_at?: string | null;
    }) => {
      setConversation((prev) => {
        if (!prev?.otherUser) return prev;
        const nextLastSeen = row.last_seen_at;
        const nextOnline = row.is_online ?? false;
        const nextActive = row.last_active_at ?? prev.otherUser.last_active_at ?? null;
        if (
          prev.otherUser.last_seen_at === nextLastSeen &&
          prev.otherUser.is_online === nextOnline &&
          prev.otherUser.last_active_at === nextActive
        ) {
          return prev;
        }
        return {
          ...prev,
          otherUser: {
            ...prev.otherUser,
            last_seen_at: nextLastSeen,
            is_online: nextOnline,
            last_active_at: nextActive,
          },
        };
      });
    };

    const refreshPresence = async () => {
      const row = await fetchParticipantPresence(otherId);
      if (!cancelled && row) applyPresence(row);
    };

    void refreshPresence();
    // Realtime kanalı anlık çevrimiçi durumunu zaten taşıyor; REST poll yalnızca ekran
    // odaktayken yedek olarak çalışır — arka plandayken gereksiz ağ/ısınma olmaz.
    const poll = setInterval(() => {
      if (!screenFocusedRef.current) return;
      void refreshPresence();
    }, 30_000);

    void (async () => {
      try {
        const next = await subscribeSupabaseChannel(channelName, (ch) =>
          ch.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${otherId}`,
            },
            (payload) => {
              applyPresence(
                payload.new as {
                  last_seen_at: string | null;
                  is_online: boolean | null;
                  last_active_at?: string | null;
                },
              );
            },
          ),
        );

        if (cancelled || generation !== presenceChannelGenRef.current) {
          await supabase.removeChannel(next);
          return;
        }

        channel = next;
      } catch {
        // stale subscribe attempt
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversation?.otherUser?.id]);

  const { remoteActivity, broadcastActivity } = useTypingIndicator({
    conversationId: id ?? null,
    currentUserId: user?.id ?? null,
  });

  const typingLabel =
    remoteActivity && conversation?.otherUser
      ? formatActivityLabel(remoteActivity.activity, displayParticipantName(conversation.otherUser))
      : null;

  const appendMessage = (message: ChatMessage) => {
    pinToBottom();
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async (contentRaw: string) => {
    const content = contentRaw.trim();
    const attachment = pendingAttachment;
    if (!user?.id || !id || (!content && !attachment)) return;
    if (!(await requireAuth('Mesaj'))) return;
    if (blockStatus?.cannotCommunicate) {
      Alert.alert('Mesaj gönderilemedi', blockStatus.bannerMessage ?? 'Bu sohbete mesaj gönderemezsiniz.');
      return;
    }

    if (editingMessage) {
      if (!content) return;
      const { error } = await editMessage(editingMessage.id, content);
      if (error) {
        Alert.alert('Düzenlenemedi', error);
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessage.id
            ? { ...m, content, editedAt: new Date().toISOString() }
            : m,
        ),
      );
      composerRef.current?.clearDraft();
      setEditingMessage(null);
      return;
    }

    if (attachment) {
      setPendingAttachment(null);
      composerRef.current?.clearDraft();

      if (attachment.messageType === 'image') {
        const assets = attachment.assets;
        const optimisticMessages: ChatMessage[] = assets.map((asset, index) => ({
          id: createLocalId(),
          conversationId: id,
          senderId: user.id,
          content: index === 0 ? content : '',
          mediaUrl: asset.uri,
          messageType: 'image',
          replyToId: null,
          editedAt: null,
          deletedForAll: false,
          isRead: false,
          createdAt: new Date().toISOString(),
          localStatus: 'sending',
          localOnly: true,
          localMediaUri: asset.uri,
        }));

        pinToBottom();
        setMessages((prev) => [...prev, ...optimisticMessages]);

        for (let i = 0; i < assets.length; i++) {
          void processImageSend(optimisticMessages[i].id, assets[i], i === 0 ? content : '');
        }
        return;
      }

      const asset = attachment.assets[0];
      const durationMs = asset.duration ?? 0;
      if (durationMs > CHAT_VIDEO_MAX_DURATION_SEC * 1000) {
        Alert.alert(
          'Video çok uzun',
          `Sohbet videoları en fazla ${Math.floor(CHAT_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
        );
        return;
      }

      const localId = createLocalId();
      const etaSec = estimateInitialVideoEtaSec(asset.fileSize ?? undefined, durationMs);

      pinToBottom();
      setMessages((prev) => [
        ...prev,
        {
          id: localId,
          conversationId: id,
          senderId: user.id,
          content,
          mediaUrl: asset.uri,
          messageType: 'video',
          replyToId: null,
          editedAt: null,
          deletedForAll: false,
          isRead: false,
          createdAt: new Date().toISOString(),
          localStatus: 'sending',
          localOnly: true,
          localMediaUri: asset.uri,
          uploadStage: 'compressing',
          uploadProgress: 0,
          uploadEtaSec: etaSec,
        },
      ]);

      void processVideoSend(localId, asset, content);
      return;
    }

    const reply = replyTo;
    const localId = createLocalId();
    const optimistic: ChatMessage = {
      id: localId,
      conversationId: id,
      senderId: user.id,
      content,
      mediaUrl: null,
      messageType: 'text',
      replyToId: reply?.id ?? null,
      editedAt: null,
      deletedForAll: false,
      isRead: false,
      createdAt: new Date().toISOString(),
      replyTo: reply ?? undefined,
      localStatus: 'sending',
      localOnly: true,
    };

    pinToBottom();
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    const { message, error } = await sendMessage(id, user.id, content, {
      replyToId: reply?.id ?? null,
    });

    if (error || !message) {
      if (error && (isBlockedByUserError(error) || error.includes('engellediniz'))) {
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        Alert.alert('Mesaj gönderilemedi', alertBlockError(error));
        return;
      }
      const replyId =
        reply?.id && !reply.id.startsWith('local-') && !reply.id.startsWith('queue-')
          ? reply.id
          : null;
      const entry = await enqueueMessage({
        conversationId: id,
        senderId: user.id,
        content,
        messageType: 'text',
        replyToId: replyId,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === localId
            ? { ...m, id: entry.id, localStatus: 'failed', queued: true, localOnly: true }
            : m,
        ),
      );
      if (error) {
        Alert.alert(
          'Mesaj gönderilemedi',
          `${error}\n\nBağlantı gelince otomatik tekrar denenecek.`,
        );
      }
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === localId
          ? {
              ...message,
              replyTo: message.replyTo ?? reply ?? undefined,
              localStatus: resolveOutgoingDeliveryStatus(
                message.createdAt,
                user.id,
                message.senderId,
                otherLastReadAtRef.current,
              ),
            }
          : m,
      ),
    );
  };

  const handleReaction = async (message: ChatMessage, emoji: string) => {
    if (message.localOnly || message.id.startsWith('local-')) return;
    const { error } = await toggleReaction(message.id, emoji);
    if (error) {
      Alert.alert('Tepki eklenemedi', error);
      return;
    }
    const grouped = await fetchMessageReactions([message.id]);
    const reactions = grouped[message.id]
      ? summarizeReactions(grouped[message.id], user?.id ?? '')
      : [];
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, reactions } : m)),
    );
    setReactionMessage(null);
  };

  const queueMediaMessage = async (
    messageType: ChatMessage['messageType'],
    content: string,
    options: {
      mediaUrl?: string | null;
      localUri?: string;
      mimeType?: string;
      fileName?: string;
    },
  ) => {
    if (!user?.id || !id) return;
    const entry = await enqueueMessage({
      conversationId: id,
      senderId: user.id,
      content,
      messageType,
      mediaUrl: options.mediaUrl ?? null,
      localUri: options.localUri ?? null,
      mimeType: options.mimeType ?? null,
      fileName: options.fileName ?? null,
    });
    appendMessage({
      id: entry.id,
      conversationId: id,
      senderId: user.id,
      content,
      mediaUrl: options.mediaUrl ?? options.localUri ?? null,
      messageType,
      replyToId: null,
      editedAt: null,
      deletedForAll: false,
      isRead: false,
      createdAt: entry.createdAt,
      localStatus: 'sending',
      localOnly: true,
      queued: true,
      localMediaUri: options.localUri ?? null,
    });
  };

  const sendMediaMessage = async (
    messageType: ChatMessage['messageType'],
    mediaUrl: string,
    content = '',
    queueFallback?: {
      localUri?: string;
      mimeType?: string;
      fileName?: string;
    },
  ) => {
    if (!user?.id || !id) return;
    const { message, error } = await sendMessage(id, user.id, content, { messageType, mediaUrl });
    if (error || !message) {
      await queueMediaMessage(messageType, content, {
        mediaUrl,
        localUri: queueFallback?.localUri,
        mimeType: queueFallback?.mimeType,
        fileName: queueFallback?.fileName,
      });
      return;
    }
    appendMessage(message);
  };

  const handlePickImage = async () => {
    if (!user?.id || !id) return;
    broadcastActivity('picking_photo');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf göndermek için galeri erişimine izin verin.');
      return;
    }

    const existingCount =
      pendingAttachment?.messageType === 'image' ? pendingAttachment.assets.length : 0;
    const remaining = CHAT_MAX_IMAGES_PER_SEND - existingCount;
    if (remaining <= 0) {
      Alert.alert('Limit', `En fazla ${CHAT_MAX_IMAGES_PER_SEND} fotoğraf gönderebilirsiniz.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (result.canceled || result.assets.length === 0) return;

    const picked = result.assets.slice(0, remaining);
    setImageSendConfirm({
      uris: picked.map((asset) => asset.uri),
      ephemeral: quickSnapEphemeral,
    });
    pinToBottom();
  };

  const handleRemovePendingImage = useCallback((index: number) => {
    setPendingAttachment((prev) => {
      if (!prev || prev.messageType !== 'image') return prev;
      const nextAssets = prev.assets.filter((_, i) => i !== index);
      if (nextAssets.length === 0) return null;
      return { messageType: 'image', assets: nextAssets };
    });
  }, []);

  const updateLocalMessage = useCallback((localId: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, ...patch } : m)));
  }, []);

  const processImageSend = useCallback(
    async (
      localId: string,
      asset: ImagePicker.ImagePickerAsset,
      content: string,
      metadata?: Record<string, unknown> | null,
    ) => {
      if (!user?.id || !id) return;

      try {
        const { url, error: uploadError } = await uploadMessageMedia(user.id, asset.uri, 'image');

        if (uploadError || !url) {
          const entry = await enqueueMessage({
            conversationId: id,
            senderId: user.id,
            content,
            messageType: 'image',
            localUri: asset.uri,
            metadata,
          });
          updateLocalMessage(localId, {
            id: entry.id,
            queued: true,
            localStatus: 'failed',
          });
          Alert.alert('Fotoğraf gönderilemedi', uploadError ?? 'Yükleme başarısız. Bağlantı gelince tekrar denenecek.');
          return;
        }

        const { message, error } = await sendMessage(id, user.id, content, {
          messageType: 'image',
          mediaUrl: url,
          metadata,
        });

        if (error || !message) {
          const entry = await enqueueMessage({
            conversationId: id,
            senderId: user.id,
            content,
            messageType: 'image',
            mediaUrl: url,
            localUri: asset.uri,
            metadata,
          });
          updateLocalMessage(localId, {
            id: entry.id,
            mediaUrl: url,
            queued: true,
            localStatus: 'failed',
          });
          if (error) {
            Alert.alert('Fotoğraf gönderilemedi', `${error}\n\nBağlantı gelince otomatik tekrar denenecek.`);
          }
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId
              ? {
                  ...message,
                  metadata: message.metadata ?? metadata ?? m.metadata,
                  localOnly: false,
                  localStatus: resolveOutgoingDeliveryStatus(
                    message.createdAt,
                    user.id,
                    message.senderId,
                    otherLastReadAtRef.current,
                  ),
                  localMediaUri: null,
                }
              : m,
          ),
        );
      } catch {
        const entry = await enqueueMessage({
          conversationId: id,
          senderId: user.id,
          content,
          messageType: 'image',
          localUri: asset.uri,
          metadata,
        });
        updateLocalMessage(localId, {
          id: entry.id,
          queued: true,
          localStatus: 'failed',
        });
        Alert.alert('Fotoğraf gönderilemedi', 'Bağlantı gelince tekrar denenecek.');
      }
    },
    [id, updateLocalMessage, user?.id],
  );

  const handleQuickCaptureResult = useCallback(
    (uri: string, ephemeral: boolean) => {
      if (!user?.id || !id) return;
      if (blockStatus?.cannotCommunicate) {
        Alert.alert('Mesaj gönderilemedi', blockStatus.bannerMessage ?? 'Bu sohbete mesaj gönderemezsiniz.');
        return;
      }

      broadcastActivity('picking_photo');
      const asset: ImagePicker.ImagePickerAsset = {
        uri,
        width: 0,
        height: 0,
      };
      const metadata = ephemeral
        ? buildEphemeralImageMetadata(CHAT_EPHEMERAL_DEFAULT_DURATION_SEC)
        : null;
      const localId = createLocalId();
      const optimisticMessage: ChatMessage = {
        id: localId,
        conversationId: id,
        senderId: user.id,
        content: '',
        mediaUrl: uri,
        messageType: 'image',
        replyToId: null,
        editedAt: null,
        deletedForAll: false,
        isRead: false,
        createdAt: new Date().toISOString(),
        localStatus: 'sending',
        localOnly: true,
        localMediaUri: uri,
        metadata,
      };

      pinToBottom();
      setMessages((prev) => [...prev, optimisticMessage]);
      void processImageSend(localId, asset, '', metadata);
    },
    [blockStatus, broadcastActivity, id, pinToBottom, processImageSend, user?.id],
  );

  const handleQuickCapture = useCallback(() => {
    if (!user?.id || !id) return;
    if (blockStatus?.cannotCommunicate) {
      Alert.alert('Mesaj gönderilemedi', blockStatus.bannerMessage ?? 'Bu sohbete mesaj gönderemezsiniz.');
      return;
    }
    setQuickCaptureVisible(true);
  }, [blockStatus, id, user?.id]);

  const handleQuickCaptureModeToggle = useCallback(() => {
    setQuickSnapEphemeral((current) => !current);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleConfirmImageSend = useCallback(() => {
    if (!imageSendConfirm) return;
    const { uris, ephemeral } = imageSendConfirm;
    setImageSendConfirm(null);
    for (const uri of uris) {
      handleQuickCaptureResult(uri, ephemeral);
    }
  }, [handleQuickCaptureResult, imageSendConfirm]);

  const handleEphemeralExpired = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              deletedForAll: true,
              mediaUrl: null,
              localMediaUri: null,
              content: '',
              metadata: {
                ...(typeof m.metadata === 'object' && m.metadata ? m.metadata : {}),
                ephemeral: true,
                expired: true,
              },
            }
          : m,
      ),
    );
  }, []);

  const handleEphemeralViewed = useCallback((messageId: string, viewedAtMs: number) => {
    setEphemeralViewedAt((prev) =>
      prev[messageId] ? prev : { ...prev, [messageId]: viewedAtMs },
    );
  }, []);

  useEphemeralMessageExpiry({
    messages,
    viewerId: user?.id,
    viewedAtByMessageId: ephemeralViewedAt,
    onExpired: handleEphemeralExpired,
  });

  const processVideoSend = useCallback(
    async (
      localId: string,
      asset: ImagePicker.ImagePickerAsset,
      content = '',
      metadata?: Record<string, unknown> | null,
    ) => {
      if (!user?.id || !id) return;

      const reportProgress = (patch: Partial<ChatMessage>) => {
        updateLocalMessage(localId, patch);
      };

      let stableUri = asset.uri;
      try {
        stableUri = await persistVideoForQueue(asset.uri);
        reportProgress({ localMediaUri: stableUri, mediaUrl: stableUri });
      } catch (err) {
        if (__DEV__) console.warn('[chat-video] persist failed', err);
      }

      try {
        const { url, error: uploadError } = await uploadMessageVideo(user.id, stableUri, {
          durationSec: asset.duration ? asset.duration / 1000 : undefined,
          mimeType: asset.mimeType ?? 'video/mp4',
          onProgress: (state) => {
            reportProgress({
              uploadStage: state.stage,
              uploadProgress: state.progress,
              uploadEtaSec: state.etaSec,
            });
          },
        });

        if (uploadError || !url) {
          if (
            uploadError?.includes('dakika') ||
            uploadError?.includes('büyük') ||
            uploadError?.includes('limiti')
          ) {
            setMessages((prev) => prev.filter((m) => m.id !== localId));
            Alert.alert('Video gönderilemedi', uploadError);
            return;
          }

          const entry = await enqueueMessage({
            conversationId: id,
            senderId: user.id,
            content,
            messageType: 'video',
            localUri: stableUri,
            mimeType: asset.mimeType ?? null,
            metadata,
          });
          reportProgress({
            id: entry.id,
            queued: true,
            localStatus: 'sending',
            uploadStage: undefined,
            uploadProgress: undefined,
            uploadEtaSec: undefined,
          });
          Alert.alert('Video gönderilemedi', uploadError ?? 'Yükleme başarısız. Bağlantı gelince tekrar denenecek.');
          return;
        }

        reportProgress({ mediaUrl: url, uploadStage: 'sending', uploadProgress: 0.95, uploadEtaSec: 1 });

        const { message, error } = await sendMessage(id, user.id, content, {
          messageType: 'video',
          mediaUrl: url,
          metadata,
        });

        if (error || !message) {
          const entry = await enqueueMessage({
            conversationId: id,
            senderId: user.id,
            content,
            messageType: 'video',
            mediaUrl: url,
            localUri: stableUri,
            mimeType: asset.mimeType ?? null,
            metadata,
          });
          reportProgress({
            id: entry.id,
            queued: true,
            localStatus: 'sending',
            uploadStage: undefined,
            uploadProgress: undefined,
            uploadEtaSec: undefined,
            mediaUrl: url,
          });
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId
              ? {
                  ...message,
                  metadata: message.metadata ?? metadata ?? m.metadata,
                  localOnly: false,
                  localStatus: 'sent',
                  localMediaUri: null,
                  uploadStage: undefined,
                  uploadProgress: undefined,
                  uploadEtaSec: undefined,
                }
              : m,
          ),
        );
      } catch (err) {
        const entry = await enqueueMessage({
          conversationId: id,
          senderId: user.id,
          content,
          messageType: 'video',
          localUri: stableUri,
          mimeType: asset.mimeType ?? null,
          metadata,
        });
        reportProgress({
          id: entry.id,
          queued: true,
          localStatus: 'sending',
          uploadStage: undefined,
          uploadProgress: undefined,
          uploadEtaSec: undefined,
        });
        Alert.alert('Video gönderilemedi', 'Bağlantı gelince tekrar denenecek.');
        if (__DEV__) console.warn('[chat-video]', err);
      }
    },
    [id, updateLocalMessage, user?.id],
  );

  const handlePickVideo = async () => {
    if (!user?.id || !id) return;
    broadcastActivity('picking_video');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.85,
      allowsMultipleSelection: false,
      copyToCacheDirectory: true,
      videoMaxDuration: CHAT_VIDEO_MAX_DURATION_SEC,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const durationMs = asset.duration ?? 0;
    if (durationMs > CHAT_VIDEO_MAX_DURATION_SEC * 1000) {
      Alert.alert(
        'Video çok uzun',
        `Sohbet videoları en fazla ${Math.floor(CHAT_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
      );
      return;
    }

    setPendingAttachment({ messageType: 'video', assets: [asset] });
    pinToBottom();
  };

  const handlePickFile = async () => {
    if (!user?.id || !id) return;

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const { url, error: uploadError } = await uploadMessageMedia(
      user.id,
      asset.uri,
      'file',
      asset.mimeType ?? undefined,
      asset.name,
    );
    const content = JSON.stringify({
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    });

    if (uploadError || !url) {
      await queueMediaMessage('file', content, {
        localUri: asset.uri,
        mimeType: asset.mimeType ?? undefined,
        fileName: asset.name,
      });
      return;
    }

    await sendMediaMessage('file', url, content, {
      localUri: asset.uri,
      mimeType: asset.mimeType ?? undefined,
      fileName: asset.name,
    });
  };

  const handleShareLocation = async () => {
    if (!user?.id || !id) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Konum izni gerekli');
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const payload = buildLocationPayloadFromGeocode(
      position.coords.latitude,
      position.coords.longitude,
      geo,
      position.coords.accuracy,
    );
    const address = formatChatLocationAddress(payload);

    const sendConfirmedLocation = async () => {
      const content = JSON.stringify(payload);
      const { message, error } = await sendMessage(id, user.id, content, {
        messageType: 'location',
      });
      if (error || !message) {
        Alert.alert('Konum gönderilemedi', error ?? 'Bilinmeyen hata');
        return;
      }
      appendMessage(message);
    };

    Alert.alert(
      'Konum paylaş',
      `${address}\n\nMevcut konumunuz bu sohbete gönderilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Gönder', onPress: () => void sendConfirmedLocation() },
      ],
    );
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
  };

  const handleStartRecording = async () => {
    if (!user?.id || !id || pendingVoice || recorderState.isRecording) return;

    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert('Mikrofon izni gerekli');
      return;
    }

    await safeSetAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    broadcastActivity('recording');
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    pinToBottom();
    scrollToBottom();
  };

  const handleCancelRecording = async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
    }
    stopRecordingTimer();
  };

  const handleStopRecording = async () => {
    if (!recorderState.isRecording) return;

    await audioRecorder.stop();
    stopRecordingTimer();
    const uri = audioRecorder.uri;
    const durationSec = recordingSeconds;

    if (!uri || durationSec < 1) {
      setPendingVoice(null);
      return;
    }

    setPendingVoice({ uri, durationSec });
    pinToBottom();
    scrollToBottom();
  };

  const handleDiscardVoice = () => {
    setPendingVoice(null);
  };

  const handleSendVoice = async () => {
    if (!user?.id || !id || !pendingVoice) return;
    if (!(await requireAuth('Mesaj'))) return;
    if (blockStatus?.cannotCommunicate) {
      Alert.alert('Mesaj gönderilemedi', blockStatus.bannerMessage ?? 'Bu sohbete mesaj gönderemezsiniz.');
      return;
    }

    const { uri, durationSec } = pendingVoice;
    const content = buildVoiceMessageContent(durationSec);
    setPendingVoice(null);

    const localId = createLocalId();
    pinToBottom();
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        conversationId: id,
        senderId: user.id,
        content,
        mediaUrl: uri,
        messageType: 'audio',
        replyToId: null,
        editedAt: null,
        deletedForAll: false,
        isRead: false,
        createdAt: new Date().toISOString(),
        localStatus: 'sending',
        localOnly: true,
        localMediaUri: uri,
      },
    ]);

    const { url, error: uploadError } = await uploadMessageMedia(user.id, uri, 'audio');
    if (uploadError || !url) {
      await queueMediaMessage('audio', content, { localUri: uri });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === localId
            ? { ...m, localStatus: 'failed', queued: true, localOnly: true }
            : m,
        ),
      );
      return;
    }

    const { message, error } = await sendMessage(id, user.id, content, {
      messageType: 'audio',
      mediaUrl: url,
    });

    if (error || !message) {
      await queueMediaMessage('audio', content, { mediaUrl: url, localUri: uri });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === localId
            ? { ...m, localStatus: 'failed', queued: true, localOnly: true, mediaUrl: url }
            : m,
        ),
      );
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === localId
          ? {
              ...message,
              localStatus: resolveOutgoingDeliveryStatus(
                message.createdAt,
                user.id,
                message.senderId,
                otherLastReadAtRef.current,
              ),
            }
          : m,
      ),
    );
  };

  const showAttachmentMenu = () => {
    const options: string[] = [];
    const handlers: Array<() => void> = [];

    if (showAttachPhoto) {
      options.push('Fotoğraf');
      handlers.push(handlePickImage);
    }
    if (showAttachVideo) {
      options.push('Video');
      handlers.push(handlePickVideo);
    }
    if (showAttachFile) {
      options.push('Dosya');
      handlers.push(handlePickFile);
    }
    if (showAttachLocation) {
      options.push('Konum');
      handlers.push(handleShareLocation);
    }

    if (options.length === 0) return;

    options.push('İptal');
    const handle = (index: number) => {
      if (index < handlers.length) handlers[index]?.();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        handle,
      );
    } else {
      Alert.alert(
        'Ekle',
        undefined,
        [
          ...options.slice(0, -1).map((label, index) => ({
            text: label,
            onPress: handlers[index],
          })),
          { text: 'İptal', style: 'cancel' },
        ],
      );
    }
  };

  const toggleSelection = (messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkCopy = async () => {
    const selected = messages.filter((m) => selectedIds.has(m.id));
    const text = await copyMessages(selected);
    if (!text) Alert.alert('Kopyalanacak metin yok');
    else exitSelectionMode();
  };

  const handleBulkDelete = async () => {
    if (!user?.id) return;
    const selected = messages.filter((m) => selectedIds.has(m.id));
    for (const message of selected) {
      if (message.localOnly) continue;
      await deleteMessageForMe(message.id, user.id);
    }
    setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    exitSelectionMode();
  };

  const handleRetryPendingMessage = async (message: ChatMessage) => {
    if (!user?.id) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, localStatus: 'sending' } : m)),
    );

    if (message.id.startsWith('queue-')) {
      const { ok, error } = await retryQueuedMessage(message.id);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
        await syncNewMessages();
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, localStatus: 'failed' } : m)),
      );
      Alert.alert('Gönderilemedi', error ?? 'Mesaj tekrar gönderilemedi.');
      return;
    }

    await flushMessageQueue();
    await syncNewMessages();
  };

  const handleCancelPendingMessage = async (message: ChatMessage) => {
    await removePendingFromQueue(message.id);
    if (message.messageType === 'text' && message.content.trim()) {
      composerRef.current?.setDraft(message.content);
      setReplyTo(null);
      setEditingMessage(null);
    }
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const handleDeletePendingMessage = async (message: ChatMessage) => {
    await removePendingFromQueue(message.id);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const showPendingMessageActions = (message: ChatMessage) => {
    const actions: { label: string; onPress: () => void; destructive?: boolean }[] = [];
    if (showPendingRetry) {
      actions.push({ label: 'Tekrar Gönder', onPress: () => void handleRetryPendingMessage(message) });
    }
    if (showPendingCancel) {
      actions.push({ label: 'İptal Et', onPress: () => void handleCancelPendingMessage(message) });
    }
    if (showPendingDelete) {
      actions.push({
        label: 'Sil',
        destructive: true,
        onPress: () => void handleDeletePendingMessage(message),
      });
    }
    if (actions.length === 0) return;

    const options = [...actions.map((action) => action.label), 'Vazgeç'];
    const destructiveIndex = actions.findIndex((action) => action.destructive);

    const run = (index: number) => {
      if (index < actions.length) actions[index]?.onPress();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        run,
      );
      return;
    }

    Alert.alert('Gönderilemeyen mesaj', undefined, [
      ...actions.map((action) => ({
        text: action.label,
        style: action.destructive ? ('destructive' as const) : undefined,
        onPress: action.onPress,
      })),
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const quoteMessage = useCallback((message: ChatMessage) => {
    if (!showMsgQuote) return;
    if (message.deletedForAll || isPendingOutgoingMessage(message, user?.id)) return;
    setReplyTo(message);
    setEditingMessage(null);
    composerRef.current?.focus();
  }, [showMsgQuote, user?.id]);

  const showMessageActions = (message: ChatMessage) => {
    if (selectionMode) {
      toggleSelection(message.id);
      return;
    }

    if (isPendingOutgoingMessage(message, user?.id)) {
      showPendingMessageActions(message);
      return;
    }

    const isMine = message.senderId === user?.id;
    const canEdit = isMine && message.messageType === 'text' && !message.deletedForAll;
    const canCopy = !message.deletedForAll;

    const actions: { label: string; onPress: () => void; destructive?: boolean }[] = [];
    if (showMsgQuote) {
      actions.push({ label: 'Alıntıla', onPress: () => quoteMessage(message) });
    }
    if (showMsgReact) {
      actions.push({ label: 'Tepki Ver', onPress: () => setReactionMessage(message) });
    }
    if (showMsgForward) {
      actions.push({ label: 'İlet', onPress: () => setForwardMessage(message) });
    }
    if (showMsgCopy && canCopy) {
      actions.push({ label: 'Kopyala', onPress: () => copyMessages([message]) });
    }
    if (showMsgSelect) {
      actions.push({
        label: 'Seç',
        onPress: () => {
          setSelectionMode(true);
          setSelectedIds(new Set([message.id]));
        },
      });
    }
    if (showMsgEdit && canEdit) {
      actions.push({
        label: 'Düzenle',
        onPress: () => {
          setEditingMessage(message);
          setReplyTo(null);
        },
      });
    }
    if (showMsgReport && !isMine) {
      actions.push({ label: 'Şikayet Et', onPress: () => setReportMessageId(message.id) });
    }
    if (showMsgDeleteMe && isMine) {
      actions.push({
        label: 'Benden sil',
        onPress: async () => {
          if (!user?.id) return;
          await deleteMessageForMe(message.id, user.id);
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
        },
      });
    }
    if (showMsgDeleteAll && isMine) {
      actions.push({
        label: 'Herkesten sil',
        destructive: true,
        onPress: async () => {
          await deleteMessageForAll(message.id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? { ...m, content: 'Bu mesaj silindi', deletedForAll: true, mediaUrl: null }
                : m,
            ),
          );
        },
      });
    }

    if (actions.length === 0) return;

    const options = [...actions.map((action) => action.label), 'İptal'];
    const destructiveIndex = actions.findIndex((action) => action.destructive);

    const handleAction = (index: number) => {
      if (index < actions.length) void actions[index]?.onPress();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        handleAction,
      );
    } else {
      Alert.alert('Mesaj', undefined, [
        ...actions.map((action) => ({
          text: action.label,
          style: action.destructive ? ('destructive' as const) : undefined,
          onPress: action.onPress,
        })),
        { text: 'İptal', style: 'cancel' },
      ]);
    }
  };

  const scrollToMessage = useCallback((list: ChatMessage[], messageId: string) => {
    const displayIndex = [...list].reverse().findIndex((m) => m.id === messageId);
    if (displayIndex < 0) {
      Alert.alert('Mesaj bulunamadı', 'Mesaj silinmiş veya yüklenemiyor olabilir.');
      return;
    }

    pendingScrollMessageIdRef.current = messageId;
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedMessageId(null), 2500);
    setScrollRequest((value) => value + 1);
  }, []);

  useEffect(() => {
    const messageId = pendingScrollMessageIdRef.current;
    if (!messageId) return;

    const displayIndex = displayMessages.findIndex((message) => message.id === messageId);
    if (displayIndex < 0) return;

    pendingScrollMessageIdRef.current = null;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: displayIndex,
        animated: false,
        viewPosition: 0.5,
      });
    });
  }, [displayMessages, scrollRequest]);

  const jumpToMessage = useCallback(
    async (target: ChatMessage) => {
      if (!id || !user?.id) return;

      if (messages.some((m) => m.id === target.id)) {
        scrollToMessage(messages, target.id);
        return;
      }

      let list = [...messages];
      let more = hasMore;
      let before = list[0]?.createdAt;

      while (more && !list.some((m) => m.id === target.id)) {
        const older = await fetchMessages(
          id,
          user.id,
          otherLastReadAtRef.current,
          PAGE_SIZE,
          before,
        );
        if (older.length === 0) {
          more = false;
          break;
        }
        list = [...older, ...list];
        before = older[0]?.createdAt;
        more = older.length >= PAGE_SIZE;
      }

      if (!list.some((m) => m.id === target.id)) {
        Alert.alert('Mesaj bulunamadı');
        return;
      }

      setMessages(capMessageList(list, [target.id]));
      markMessagesEntered(list);
      setHasMore(more || list.length >= PAGE_SIZE);
      scrollToMessage(list, target.id);
    },
    [id, user?.id, messages, hasMore, scrollToMessage, markMessagesEntered],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      // conversation referansı presence poll/realtime ile sık değişiyor; callback kimliğini
      // sabit tutmak için son değeri ref'ten okuyoruz (deps yalnızca kararlı alanlar).
      const conv = conversationRef.current;
      const isMine = item.senderId === user?.id;
      const isFiltered =
        otherUserRestricted && !isMine && item.senderId === conv?.otherUser?.id;
      const marginBottom = bubbleMarginBeforeNext(item, displayMessagesRef.current[index + 1]);
      const isGroup = conv?.type === 'group';
      const showSenderAvatar =
        isGroup &&
        !isMine &&
        (index === 0 || displayMessagesRef.current[index - 1]?.senderId !== item.senderId);
      const sender = isGroup && conv ? resolveGroupMessageSender(item, conv) : item.sender;
      const bubbleMessage = sender && sender !== item.sender ? { ...item, sender } : item;
      const canTapCopy =
        showMsgCopy &&
        !selectionMode &&
        item.messageType === 'text' &&
        !item.deletedForAll &&
        Boolean(item.content.trim());
      const bubble = (
        <ChatBubble
          message={bubbleMessage}
          isMine={isMine}
          isGroup={isGroup}
          showSenderAvatar={showSenderAvatar}
          isFiltered={isFiltered}
          isHighlighted={highlightedMessageId === item.id}
          marginBottom={marginBottom}
          onLongPress={selectionMode ? undefined : () => showMessageActions(item)}
          onDoublePress={showMsgQuote ? () => quoteMessage(item) : undefined}
          onCopy={canTapCopy ? () => void handleCopyMessage(item) : undefined}
          onQuotePress={() => item.replyTo && void jumpToMessage(item.replyTo)}
          onReactionPress={(emoji) => handleReaction(item, emoji)}
          onEphemeralExpired={handleEphemeralExpired}
          onEphemeralViewed={handleEphemeralViewed}
          ephemeralViewedAtByMessageId={ephemeralViewedAt}
        />
      );

      if (selectionMode) {
        return (
          <Pressable onPress={() => toggleSelection(item.id)} style={styles.messageRow}>
            <View style={styles.selectRow}>
              <Ionicons
                name={selectedIds.has(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selectedIds.has(item.id) ? colors.primary : colors.textSecondary}
              />
              {bubble}
            </View>
          </Pressable>
        );
      }

      return (
        <View style={styles.messageItem} collapsable={false}>
          {shouldAnimateChatBubbles() ? (
            <ChatBubbleEntrance
              messageId={item.id}
              isMine={isMine}
              enteredMessageIds={enteredMessageIdsRef.current}
              onMarkEntered={markMessageEntered}
            >
              {bubble}
            </ChatBubbleEntrance>
          ) : (
            bubble
          )}
        </View>
      );
    },
    [
      user?.id,
      otherUserRestricted,
      conversation?.otherUser?.id,
      conversation?.type,
      highlightedMessageId,
      selectionMode,
      selectedIds,
      colors.primary,
      colors.textSecondary,
      jumpToMessage,
      quoteMessage,
      markMessageEntered,
      handleCopyMessage,
    ],
  );

  const listExtraData = useMemo(
    () =>
      `${messageListRenderKey(messages)}:${highlightedMessageId ?? ''}:${selectionMode}:${selectedIds.size}:${conversation?.type === 'group' ? conversation.members.length : 0}`,
    [messages, highlightedMessageId, selectionMode, selectedIds.size, conversation?.type, conversation?.members.length],
  );

  const chatListProps = useMemo(() => {
    const androidPerf = getAndroidFlatListPerfProps();
    const initialCount = getChatInitialRenderCount();
    return {
      ...(Platform.OS === 'android' ? androidPerf : {}),
      windowSize: Platform.OS === 'android' ? (androidPerf.windowSize ?? 4) : 15,
      initialNumToRender: Math.min(displayMessages.length || initialCount, initialCount),
      maxToRenderPerBatch:
        Platform.OS === 'android' ? (androidPerf.maxToRenderPerBatch ?? 4) : 10,
      updateCellsBatchingPeriod:
        Platform.OS === 'android' ? (androidPerf.updateCellsBatchingPeriod ?? 80) : 50,
      extraData: listExtraData,
      onScroll: handleScroll,
      scrollEventThrottle: 16 as const,
      maintainVisibleContentPosition: loadingMore
        ? { minIndexForVisible: 1, autoscrollToTopThreshold: 100 }
        : undefined,
      onEndReached: loadOlder,
      onEndReachedThreshold: 0.2,
      onScrollToIndexFailed: (info) => {
        flatListRef.current?.scrollToOffset({
          offset: Math.max(info.averageItemLength * info.index, 0),
          animated: false,
        });
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: info.index,
            animated: false,
            viewPosition: 0.5,
          });
        }, 120);
      },
      ListFooterComponent: loadingMore ? (
        <ActivityIndicator color={colors.primary} style={styles.loadMore} />
      ) : null,
    };
  }, [listExtraData, handleScroll, loadingMore, loadOlder, colors.primary, displayMessages.length]);

  const displayConversation = useMemo((): ConversationDetail | null => {
    if (conversation) return conversation;
    if (!id) return null;
    const snapshotConversation = readConversationOpenSnapshot(id, user?.id).conversation;
    if (snapshotConversation) return snapshotConversation;
    return minimalConversationDetail(id);
  }, [conversation, id, user?.id]);

  if (!conversation && detailResolved) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: spacing.lg }]}>
        <ScreenBackButton style={{ marginBottom: spacing.md, alignSelf: 'flex-start' }} />
        <Text secondary>Sohbet bulunamadı</Text>
        <Pressable style={styles.retryBtn} onPress={() => load()}>
          <Text variant="label" style={{ color: colors.primary }}>
            Tekrar dene
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!displayConversation) return null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: chat.screenBg }]} edges={['top']}>
      <ChatHeader
        conversation={displayConversation}
        typingLabel={typingLabel}
        onSearchPress={() => setSearchVisible(true)}
        onGalleryPress={() => setGalleryVisible(true)}
        hideCalls={blockStatus?.cannotCommunicate ?? false}
        onMenuPress={() => {
          if (!id || !user?.id) return;
          const other = conversation?.otherUser ?? displayConversation.otherUser;
          showChatMenuActions(
            id,
            async () => {
              const { error } = await clearConversationHistory(id);
              if (error) Alert.alert('Temizlenemedi', error);
              else {
                setMessages([]);
                useMessagingStore.getState().clearCachedConversation(id);
                Alert.alert('Geçmiş temizlendi');
              }
            },
            async () => {
              const { error } = await deleteConversationForUser(id);
              if (error) Alert.alert('Silinemedi', error);
              else router.replace('/(tabs)/messages');
            },
            other
              ? {
                  blockedByMe: blockStatus?.blockedByMe ?? false,
                  otherUserName: other.username,
                  onBlock: async () => {
                    const { error } = await blockUser(user.id, other.id);
                    if (error) Alert.alert('Hata', error);
                    else {
                      const status = await fetchDirectBlockStatus(user.id, other.id);
                      setBlockStatus(status);
                    }
                  },
                  onUnblock: async () => {
                    const { error } = await unblockUser(user.id, other.id);
                    if (error) Alert.alert('Hata', error);
                    else {
                      const status = await fetchDirectBlockStatus(user.id, other.id);
                      setBlockStatus(status);
                    }
                  },
                }
              : undefined,
          );
        }}
      />

      {blockStatus?.bannerMessage ? (
        <View style={[styles.restrictedBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="ban-outline" size={16} color={colors.danger} />
          <Text variant="caption" secondary style={styles.blockBannerText}>
            {blockStatus.bannerMessage}
          </Text>
        </View>
      ) : null}

      {otherUserRestricted ? (
        <View style={[styles.restrictedBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text variant="caption" secondary>
            Kısıtlanmış kullanıcı — mesajları filtrelendi
          </Text>
        </View>
      ) : null}

      {fromIzdivac ? <IzdivacChatBanner /> : null}
      {heyetCase ? <HeyetChatBanner heyetCase={heyetCase} /> : null}
      {heyetCase && isAdminUser ? (
        <HeyetAdminBar heyetCase={heyetCase} onChanged={() => void refreshHeyetCase()} />
      ) : null}

      <View style={styles.flex}>
        <ChatConversationLayout
          listRef={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          footerBackgroundColor={chat.composerBg}
          footerSolidColor={chat.composerBgSolid}
          background={<ChatBackground />}
          contentContainerStyle={styles.listContent}
          listProps={chatListProps}
          footer={
              selectionMode ? (
                <ChatSelectionBar
                  count={selectedIds.size}
                  onCancel={exitSelectionMode}
                  onCopy={handleBulkCopy}
                  onForward={() => {
                    const selected = messages.filter((m) => selectedIds.has(m.id));
                    setForwardMessages(selected);
                  }}
                  onDelete={handleBulkDelete}
                />
              ) : (
                <ChatComposer
                  ref={composerRef}
                  conversationId={id}
                  initialDraft={conversationDraft}
                  onDraftChange={handleDraftChange}
                  onSend={handleSend}
                  onTyping={() => broadcastActivity('typing')}
                  onAttach={showAttachmentMenu}
                  onQuickCapture={handleQuickCapture}
                  onQuickCaptureModeToggle={handleQuickCaptureModeToggle}
                  quickCaptureEphemeral={quickSnapEphemeral}
                  onPickImage={handlePickImage}
                  onToggleRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  onCancelRecording={handleCancelRecording}
                  isRecording={recorderState.isRecording}
                  recordingSeconds={recordingSeconds}
                  pendingVoice={pendingVoice}
                  onDiscardVoice={handleDiscardVoice}
                  onSendVoice={handleSendVoice}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  editingMessage={editingMessage}
                  onCancelEdit={() => {
                    setEditingMessage(null);
                    const saved = id ? getMessageDraft(id) : '';
                    composerRef.current?.setDraft(saved);
                  }}
                  disabled={(blockStatus?.cannotCommunicate ?? false) || heyetComposerLocked}
                  disabledHint={
                    heyetComposerLocked
                      ? 'Heyet kapatıldı — mesaj gönderilemez'
                      : blockStatus?.bannerMessage ?? undefined
                  }
                  attachmentPreview={
                    pendingAttachment
                      ? pendingAttachment.messageType === 'video'
                        ? { type: 'video', uri: pendingAttachment.assets[0].uri }
                        : { type: 'image', uris: pendingAttachment.assets.map((a) => a.uri) }
                      : null
                  }
                  onClearAttachment={() => setPendingAttachment(null)}
                  onRemoveAttachmentAt={
                    pendingAttachment?.messageType === 'image' ? handleRemovePendingImage : undefined
                  }
                  onOpenAttachmentPreview={handleOpenAttachmentPreview}
                />
              )
            }
          />
      </View>

      <ChatSearchSheet
        visible={searchVisible}
        conversationId={id ?? ''}
        userId={user?.id ?? ''}
        onClose={() => setSearchVisible(false)}
        onSelectMessage={jumpToMessage}
      />

      <ChatMediaGallery
        visible={galleryVisible}
        conversationId={id ?? ''}
        userId={user?.id ?? ''}
        onClose={() => setGalleryVisible(false)}
        onSelectMessage={jumpToMessage}
      />

      <ForwardSheet
        visible={!!forwardMessage || forwardMessages.length > 0}
        message={forwardMessage}
        messages={forwardMessages.length > 0 ? forwardMessages : undefined}
        senderId={user?.id ?? ''}
        currentConversationId={id}
        onClose={() => {
          setForwardMessage(null);
          setForwardMessages([]);
        }}
        onForwarded={exitSelectionMode}
      />

      <Modal visible={!!reactionMessage} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={() => setReactionMessage(null)}>
        <Pressable style={styles.reactionBackdrop} onPress={() => setReactionMessage(null)}>
          <Pressable
            style={[styles.reactionPicker, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.reactionBtn}
                onPress={() => reactionMessage && handleReaction(reactionMessage, emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {reportMessageId ? (
        <ReportSheet
          visible={!!reportMessageId}
          targetType="message"
          targetId={reportMessageId}
          onClose={() => setReportMessageId(null)}
        />
      ) : null}

      {copyToastVisible ? (
        <View
          style={[styles.copyToast, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text variant="caption" style={{ fontWeight: '600' }}>
            Kopyalandı
          </Text>
        </View>
      ) : null}

      <ChatQuickCapture
        visible={quickCaptureVisible}
        ephemeral={quickSnapEphemeral}
        onEphemeralChange={setQuickSnapEphemeral}
        onClose={() => setQuickCaptureVisible(false)}
        onPreview={({ uri, ephemeral }) => {
          setQuickSnapEphemeral(ephemeral);
          setImageSendConfirm({ uris: [uri], ephemeral });
        }}
      />

      <ChatImageSendConfirm
        visible={Boolean(imageSendConfirm)}
        uris={imageSendConfirm?.uris ?? []}
        ephemeral={imageSendConfirm?.ephemeral ?? true}
        onEphemeralChange={(ephemeral) =>
          setImageSendConfirm((prev) => (prev ? { ...prev, ephemeral } : null))
        }
        onCancel={() => setImageSendConfirm(null)}
        onSend={handleConfirmImageSend}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  messageRow: {
    width: '100%',
  },
  messageItem: {
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: CHAT_LIST_HORIZONTAL_PAD,
    paddingVertical: 8,
  },
  loadMore: {
    paddingVertical: spacing.sm,
  },
  messagesLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  restrictedBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  copyToast: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  blockBannerText: {
    flex: 1,
  },
  reactionBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  reactionPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
  },
  reactionBtn: {
    padding: spacing.sm,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: '100%',
  },
});
