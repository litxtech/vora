import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { fetchConversationList } from '../services/conversationData';
import {
  getCachedConversationList,
  hydrateConversationListCache,
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
import {
  getInboxDiskHydrateLimit,
  shouldDeferHeavyFocusWork,
} from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';

function scheduleInboxDiskHydrate(userId: string, conversationIds: string[]) {
  const targets = conversationIds.slice(0, getInboxDiskHydrateLimit());
  if (targets.length === 0) return;

  const run = () => {
    void hydrateMessageDiskCache(userId, targets);
  };

  if (shouldDeferHeavyFocusWork()) {
    deferBackgroundWork(run);
    return;
  }
  run();
}

function listScopeKey(userId: string, archivedOnly: boolean): string {
  return `${userId}:${archivedOnly ? 'archived' : 'inbox'}`;
}

export function useConversationList(enabled = true, archivedOnly = false) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const scopeKey = userId ? listScopeKey(userId, archivedOnly) : null;
  const cachedNow = userId ? getCachedConversationList(userId, archivedOnly) : null;

  const [conversations, setConversations] = useState<ConversationListItem[]>(cachedNow ?? []);
  const [ready, setReady] = useState(Boolean(cachedNow?.length));
  const [error, setError] = useState<string | null>(null);
  const activeConversationId = useMessagingStore((s) => s.activeConversationId);
  const setUnreadFromConversations = useMessagingStore((s) => s.setUnreadFromConversations);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const conversationsRef = useRef(conversations);
  const seenScopeRef = useRef(scopeKey);
  activeConversationIdRef.current = activeConversationId;
  conversationsRef.current = conversations;

  // Sekme odağı gelmeden önce yazılmış önbellek ilk boyada görünsün.
  if (scopeKey !== seenScopeRef.current) {
    seenScopeRef.current = scopeKey;
    const next = userId ? getCachedConversationList(userId, archivedOnly) : null;
    setConversations(next ?? []);
    setReady(Boolean(next?.length));
  }

  const refresh = useCallback(
    async (silent = false) => {
      if (!userId) return;

      const cached = getCachedConversationList(userId, archivedOnly);
      const quiet =
        silent ||
        shouldUseSilentListRefresh() ||
        conversationsRef.current.length > 0 ||
        !!cached?.length;

      if (!quiet && cached?.length) {
        setConversations(cached);
        setReady(true);
      }

      setError(null);
      try {
        const list = await fetchConversationList(archivedOnly);
        setCachedConversationList(userId, archivedOnly, list);
        setConversations(list);
        setReady(true);
        if (!archivedOnly) {
          setUnreadFromConversations(list);
          scheduleInboxDiskHydrate(
            userId,
            list.map((item) => item.id),
          );
        }
      } catch (err) {
        setError(String(err));
        setReady(true);
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
      setReady(false);
      return;
    }

    let cancelled = false;

    const paintCache = async () => {
      let cached = getCachedConversationList(userId, archivedOnly);
      if (!cached?.length) {
        await hydrateConversationListCache();
        if (cancelled) return;
        cached = getCachedConversationList(userId, archivedOnly);
      }
      if (cancelled || !cached?.length) return;

      setConversations(cached);
      setReady(true);
      if (!archivedOnly) {
        scheduleInboxDiskHydrate(
          userId,
          cached.map((item) => item.id),
        );
      }
    };

    const refreshNow = () => {
      if (!cancelled) void refreshRef.current(true);
    };

    // Önbellek hemen boyansın. Ağ isteği, sekme kapalıyken akışın ilk karesini beklesin.
    if (!enabled && shouldDeferHeavyFocusWork()) {
      void paintCache();
      const task = deferBackgroundWork(refreshNow);
      return () => {
        cancelled = true;
        task.cancel();
      };
    }

    void (async () => {
      await paintCache();
      refreshNow();
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, archivedOnly, enabled]);

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
    ready,
    error,
    refresh: refreshPublic,
    refreshSilent: refreshSilentPublic,
  };
}
