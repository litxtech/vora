import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { fetchConversationList } from '../services/conversationData';
import {
  getCachedConversationList,
  setCachedConversationList,
} from '../services/conversationListCache';
import { subscribeInboxRealtime } from '../services/inboxRealtime';
import { hydrateMessageDiskCache } from '../services/messageDiskCache';
import { useMessagingStore } from '../store/messagingStore';
import type { ConversationListItem } from '../types';
import {
  applyConversationPreviewUpdate,
  applyConversationRead,
  applyIncomingMessageToConversationList,
  type IncomingMessageRow,
} from '../utils/inboxUpdates';
import {
  resolveSilentRefreshDebounceMs,
  shouldUseSilentListRefresh,
} from '@/lib/ui/listRefresh';

export function useConversationList(enabled = true, archivedOnly = false) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const initialCache =
    userId && enabled ? getCachedConversationList(userId, archivedOnly) : null;

  const [conversations, setConversations] = useState<ConversationListItem[]>(initialCache ?? []);
  const [error, setError] = useState<string | null>(null);
  const activeConversationId = useMessagingStore((s) => s.activeConversationId);
  const setUnreadFromConversations = useMessagingStore((s) => s.setUnreadFromConversations);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const conversationsRef = useRef(conversations);
  const enabledRef = useRef(enabled);
  activeConversationIdRef.current = activeConversationId;
  conversationsRef.current = conversations;
  enabledRef.current = enabled;

  const refresh = useCallback(
    async (silent = false) => {
      if (!enabledRef.current || !userId) return;

      const cached = getCachedConversationList(userId, archivedOnly);
      const quiet =
        silent ||
        shouldUseSilentListRefresh() ||
        conversationsRef.current.length > 0 ||
        !!cached?.length;

      if (!quiet && cached?.length) {
        setConversations(cached);
      }

      setError(null);
      try {
        const list = await fetchConversationList(archivedOnly);
        setCachedConversationList(userId, archivedOnly, list);
        setConversations(list);
        if (!archivedOnly) {
          setUnreadFromConversations(list);
          void hydrateMessageDiskCache(userId, list.map((item) => item.id));
        }
      } catch (err) {
        setError(String(err));
      }
    },
    [archivedOnly, setUnreadFromConversations, userId],
  );

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      void refreshRef.current(true);
    }, resolveSilentRefreshDebounceMs(600));
  }, []);

  const handleIncomingMessage = useCallback(
    (row: IncomingMessageRow) => {
      let needsFullRefresh = false;

      setConversations((prev) => {
        const result = applyIncomingMessageToConversationList(
          prev,
          row,
          userId ?? '',
          activeConversationIdRef.current,
        );
        needsFullRefresh = result.needsFullRefresh;
        return result.list;
      });

      if (needsFullRefresh) {
        void refreshRef.current(true);
      }
    },
    [userId],
  );

  const handleIncomingMessageRef = useRef(handleIncomingMessage);
  handleIncomingMessageRef.current = handleIncomingMessage;

  const scheduleSilentRefreshRef = useRef(scheduleSilentRefresh);
  scheduleSilentRefreshRef.current = scheduleSilentRefresh;

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      return;
    }

    const cached = getCachedConversationList(userId, archivedOnly);
    if (cached?.length) {
      setConversations(cached);
      if (!archivedOnly) {
        void hydrateMessageDiskCache(userId, cached.map((item) => item.id));
      }
      void refreshRef.current(true);
      return;
    }

    void refreshRef.current(true);
  }, [userId, archivedOnly]);

  const prevActiveConversationRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeConversationId) {
      setConversations((prev) => applyConversationRead(prev, activeConversationId));
      prevActiveConversationRef.current = activeConversationId;
      return;
    }

    if (prevActiveConversationRef.current && !activeConversationId) {
      void refreshRef.current(true);
    }
    prevActiveConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    return subscribeInboxRealtime(userId, {
      onMessage: (row) => {
        handleIncomingMessageRef.current(row);
        scheduleSilentRefreshRef.current();
      },
      onConversationUpdate: (row) => {
        setConversations((prev) =>
          applyConversationPreviewUpdate(
            prev,
            row.id,
            row.last_message_at,
            row.last_message_preview,
          ),
        );
      },
    });
  }, [enabled, userId]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const refreshPublic = useCallback(() => refresh(false), [refresh]);
  const refreshSilentPublic = useCallback(() => refresh(true), [refresh]);

  return {
    conversations,
    error,
    refresh: refreshPublic,
    refreshSilent: refreshSilentPublic,
  };
}
