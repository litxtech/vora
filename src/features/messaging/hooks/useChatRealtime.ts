import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import type { ChatMessage } from '../types';

type UseChatRealtimeOptions = {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: ChatMessage) => void;
  onMessageUpdated?: (message: Partial<ChatMessage> & { id: string }) => void;
  onReactionChange?: (messageId: string) => void;
  /** Kanal SUBSCRIBED olunca — kaçırılan mesajları hemen çek. */
  onSubscribed?: () => void;
};

type DbMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: ChatMessage['messageType'];
  metadata?: Record<string, unknown> | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  edited_at: string | null;
  deleted_for_all: boolean;
  is_read: boolean;
  created_at: string;
};

function mapRowToMessage(row: DbMessageRow, currentUserId: string | null): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    mediaUrl: row.media_url,
    messageType: row.message_type,
    metadata: (row.metadata as ChatMessage['metadata']) ?? null,
    replyToId: row.reply_to_id,
    forwardedFromId: row.forwarded_from_id,
    editedAt: row.edited_at,
    deletedForAll: row.deleted_for_all,
    isRead: row.is_read,
    createdAt: row.created_at,
    localStatus: row.sender_id === currentUserId ? 'sent' : 'delivered',
  };
}

export function useChatRealtime({
  conversationId,
  currentUserId,
  onNewMessage,
  onMessageUpdated,
  onReactionChange,
  onSubscribed,
}: UseChatRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onReactionChangeRef = useRef(onReactionChange);
  const onSubscribedRef = useRef(onSubscribed);
  const currentUserIdRef = useRef(currentUserId);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribeSeqRef = useRef(0);

  onNewMessageRef.current = onNewMessage;
  onMessageUpdatedRef.current = onMessageUpdated;
  onReactionChangeRef.current = onReactionChange;
  onSubscribedRef.current = onSubscribed;
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const channelName = `chat-${conversationId}`;

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!cancelled) void subscribe();
      }, 250);
    };

    const handleInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as DbMessageRow;
      const message = mapRowToMessage(row, currentUserIdRef.current);
      onNewMessageRef.current(message);
    };

    const handleUpdate = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as {
        id: string;
        content: string;
        edited_at: string | null;
        deleted_for_all: boolean;
        is_read: boolean;
        metadata?: Record<string, unknown> | null;
        media_url?: string | null;
      };
      onMessageUpdatedRef.current?.({
        id: row.id,
        content: row.deleted_for_all ? 'Bu mesaj silindi' : row.content,
        editedAt: row.edited_at,
        deletedForAll: row.deleted_for_all,
        isRead: row.is_read,
        ...(row.metadata !== undefined
          ? { metadata: row.metadata as ChatMessage['metadata'] }
          : {}),
        ...(row.deleted_for_all ? { mediaUrl: null } : {}),
      });
    };

    const subscribe = async () => {
      const seq = ++subscribeSeqRef.current;

      if (channelRef.current) {
        const stale = channelRef.current;
        channelRef.current = null;
        await supabase.removeChannel(stale);
      }

      if (cancelled || seq !== subscribeSeqRef.current) return;

      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled || seq !== subscribeSeqRef.current) return;

      if (sessionData.session?.access_token) {
        await supabase.realtime.setAuth(sessionData.session.access_token);
      }

      if (cancelled || seq !== subscribeSeqRef.current) return;

      try {
        const channel = await subscribeSupabaseChannel(
          channelName,
          (ch) =>
            ch
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'messages',
                  filter: `conversation_id=eq.${conversationId}`,
                },
                handleInsert,
              )
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'messages',
                  filter: `conversation_id=eq.${conversationId}`,
                },
                handleUpdate,
              ),
          (status, err) => {
            if (seq !== subscribeSeqRef.current) return;

            if (__DEV__ && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
              console.warn(`[useChatRealtime] ${channelName} status:`, status, err ?? '');
            }
            if (status === 'SUBSCRIBED') {
              onSubscribedRef.current?.();
            }
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (cancelled || channelRef.current !== channel) return;
              const unauthorized =
                err instanceof Error && /unauthorized|permission/i.test(err.message);
              if (unauthorized) return;
              scheduleReconnect();
            }
          },
        );

        if (cancelled || seq !== subscribeSeqRef.current) {
          await supabase.removeChannel(channel);
          return;
        }

        channelRef.current = channel;
      } catch {
        if (!cancelled && seq === subscribeSeqRef.current) {
          scheduleReconnect();
        }
      }
    };

    void subscribe();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && !cancelled) {
        onSubscribedRef.current?.();
      }
    });

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session?.access_token) return;
      setTimeout(() => {
        if (cancelled || !session.access_token) return;
        void supabase.realtime.setAuth(session.access_token).then(() => {
          if (_event === 'TOKEN_REFRESHED') void subscribe();
        });
      }, 0);
    });

    return () => {
      cancelled = true;
      subscribeSeqRef.current += 1;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      appStateSub.remove();
      authSub.unsubscribe();
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);
}
