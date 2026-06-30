import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchLiveSupportMessages,
  fetchMyLiveSupportThread,
  markLiveSupportRead,
  sendLiveSupportMessage,
  startLiveSupportThread,
} from '@/features/live-support/services/liveSupportData';
import {
  uploadLiveSupportImage,
  uploadLiveSupportVideo,
} from '@/features/live-support/services/liveSupportMedia';
import { useLiveSupportRealtime } from '@/features/live-support/hooks/useLiveSupportRealtime';
import {
  buildLiveSupportMessage,
  mergeLiveSupportMessages,
} from '@/features/live-support/utils/messageList';
import {
  filterLiveSupportSessionMessages,
  isLiveSupportThreadInactive,
} from '@/features/live-support/utils/threadSession';
import type {
  LiveSupportMessage,
  LiveSupportMessageType,
  LiveSupportThread,
  LiveSupportTopic,
} from '@/features/live-support/types';
import { useAuth } from '@/providers/AuthProvider';

export function useLiveSupportChat() {
  const { user } = useAuth();
  const [thread, setThread] = useState<LiveSupportThread | null>(null);
  const [messages, setMessages] = useState<LiveSupportMessage[]>([]);
  const [sessionStartAt, setSessionStartAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pastMessages, setPastMessages] = useState<LiveSupportMessage[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const knownMessageIdsRef = useRef(new Set<string>());

  const displayMessages = useMemo(
    () => filterLiveSupportSessionMessages(messages, sessionStartAt),
    [messages, sessionStartAt],
  );

  const hasPastSession = Boolean(
    thread?.last_message_at && isLiveSupportThreadInactive(thread.status),
  );

  const clearActiveChat = useCallback(() => {
    setMessages([]);
    setSessionStartAt(null);
    knownMessageIdsRef.current.clear();
  }, []);

  const appendMessage = useCallback((message: LiveSupportMessage) => {
    if (knownMessageIdsRef.current.has(message.id)) return;
    knownMessageIdsRef.current.add(message.id);
    setMessages((current) => [...current, message]);
  }, []);

  const refreshThread = useCallback(async () => {
    const nextThread = await fetchMyLiveSupportThread();
    setThread((current) => {
      if (!nextThread) return null;
      if (
        current &&
        current.id === nextThread.id &&
        current.status === nextThread.status &&
        current.user_unread_count === nextThread.user_unread_count &&
        current.session_expires_at === nextThread.session_expires_at &&
        current.updated_at === nextThread.updated_at
      ) {
        return current;
      }
      return nextThread;
    });
    return nextThread;
  }, []);

  const refreshThreadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshThreadInFlightRef = useRef(false);

  const scheduleRefreshThread = useCallback(() => {
    if (refreshThreadTimerRef.current) return;
    refreshThreadTimerRef.current = setTimeout(() => {
      refreshThreadTimerRef.current = null;
      if (refreshThreadInFlightRef.current) return;
      refreshThreadInFlightRef.current = true;
      void refreshThread().finally(() => {
        refreshThreadInFlightRef.current = false;
      });
    }, 400);
  }, [refreshThread]);

  useEffect(
    () => () => {
      if (refreshThreadTimerRef.current) {
        clearTimeout(refreshThreadTimerRef.current);
      }
    },
    [],
  );

  const loadMessages = useCallback(async (threadId: string) => {
    const rows = await fetchLiveSupportMessages(threadId);
    setMessages((current) => {
      const withoutLocal = current.filter((row) => !row.id.startsWith('local-'));
      const merged = mergeLiveSupportMessages(rows, withoutLocal);
      knownMessageIdsRef.current = new Set(merged.map((row) => row.id));
      return merged;
    });
    await markLiveSupportRead(threadId);
    setThread((current) => (current ? { ...current, user_unread_count: 0 } : current));
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      const nextThread = await refreshThread();
      if (nextThread && !isLiveSupportThreadInactive(nextThread.status)) {
        setSessionStartAt(null);
        await loadMessages(nextThread.id);
      } else {
        clearActiveChat();
      }
      if (!silent) setLoading(false);
    },
    [clearActiveChat, loadMessages, refreshThread],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!thread || !isLiveSupportThreadInactive(thread.status)) return;
    if (sessionStartAt) return;
    clearActiveChat();
  }, [clearActiveChat, sessionStartAt, thread?.id, thread?.status]);

  useEffect(() => {
    if (!thread?.session_expires_at || isLiveSupportThreadInactive(thread.status)) return;

    const expiresAt = new Date(thread.session_expires_at).getTime();
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      void refreshThread();
      return;
    }

    const timer = setTimeout(() => {
      void refreshThread();
    }, delay + 500);

    return () => clearTimeout(timer);
  }, [refreshThread, thread?.session_expires_at, thread?.status]);

  useLiveSupportRealtime({
    threadId: thread?.id ?? null,
    onNewMessage: (message) => {
      if (thread && isLiveSupportThreadInactive(thread.status)) return;
      appendMessage(message);
      if (thread?.id) {
        void markLiveSupportRead(thread.id);
      }
      scheduleRefreshThread();
    },
    onThreadUpdated: () => {
      scheduleRefreshThread();
    },
  });

  const loadPastMessages = useCallback(async () => {
    if (!thread?.id) return;
    setPastLoading(true);
    setPastMessages(await fetchLiveSupportMessages(thread.id));
    setPastLoading(false);
  }, [thread?.id]);

  const beginNewSession = useCallback(() => {
    setSessionStartAt(new Date(Date.now() - 5000).toISOString());
    setMessages([]);
    knownMessageIdsRef.current.clear();
  }, []);

  const startThread = useCallback(
    async (
      content: string,
      topic?: LiveSupportTopic | null,
      options?: { messageType?: LiveSupportMessageType; mediaUrl?: string | null },
    ) => {
      if (thread && isLiveSupportThreadInactive(thread.status)) {
        beginNewSession();
      }

      setSending(true);
      const { threadId, error } = await startLiveSupportThread(content, topic, options);
      setSending(false);
      if (error || !threadId) return { error: error ?? 'Sohbet başlatılamadı' };

      const trimmed = content.trim();
      if (user?.id) {
        appendMessage(
          buildLiveSupportMessage({
            id: `local-${Date.now()}`,
            threadId,
            senderId: user.id,
            content: trimmed,
            messageType: options?.messageType,
            mediaUrl: options?.mediaUrl,
          }),
        );
      }

      await loadMessages(threadId);
      const nextThread = await refreshThread();
      if (nextThread && !isLiveSupportThreadInactive(nextThread.status)) {
        setSessionStartAt(null);
      }
      return { error: null };
    },
    [appendMessage, beginNewSession, loadMessages, refreshThread, thread, user?.id],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      topic?: LiveSupportTopic | null,
      options?: { messageType?: LiveSupportMessageType; mediaUrl?: string | null },
    ) => {
      if (!thread?.id) {
        return startThread(content, topic, options);
      }

      if (isLiveSupportThreadInactive(thread.status)) {
        beginNewSession();
      }

      setSending(true);
      const { messageId, error } = await sendLiveSupportMessage(thread.id, content, options);
      setSending(false);
      if (error) return { error };

      if (user?.id) {
        appendMessage(
          buildLiveSupportMessage({
            id: messageId ?? `local-${Date.now()}`,
            threadId: thread.id,
            senderId: user.id,
            content: content.trim(),
            messageType: options?.messageType,
            mediaUrl: options?.mediaUrl,
          }),
        );
      }

      void loadMessages(thread.id);
      void refreshThread().then((nextThread) => {
        if (nextThread && !isLiveSupportThreadInactive(nextThread.status)) {
          setSessionStartAt(null);
        }
      });
      return { error: null };
    },
    [appendMessage, beginNewSession, loadMessages, refreshThread, startThread, thread, user?.id],
  );

  const sendImage = useCallback(
    async (localUri: string, caption = '', topic?: LiveSupportTopic | null, mimeType?: string) => {
      if (!user?.id) return { error: 'Oturum bulunamadı' };

      setSending(true);
      const { url, error: uploadError } = await uploadLiveSupportImage(user.id, localUri, mimeType);
      if (uploadError || !url) {
        setSending(false);
        return { error: uploadError ?? 'Görsel yüklenemedi' };
      }

      const result = await sendMessage(caption, topic, { messageType: 'image', mediaUrl: url });
      setSending(false);
      return result;
    },
    [sendMessage, user?.id],
  );

  const sendVideo = useCallback(
    async (
      localUri: string,
      caption = '',
      topic?: LiveSupportTopic | null,
      durationSec?: number,
      mimeType?: string,
    ) => {
      if (!user?.id) return { error: 'Oturum bulunamadı' };

      setSending(true);
      const { url, error: uploadError } = await uploadLiveSupportVideo(user.id, localUri, {
        durationSec,
        mimeType,
      });
      if (uploadError || !url) {
        setSending(false);
        return { error: uploadError ?? 'Video yüklenemedi' };
      }

      const result = await sendMessage(caption, topic, { messageType: 'video', mediaUrl: url });
      setSending(false);
      return result;
    },
    [sendMessage, user?.id],
  );

  return {
    user,
    thread,
    messages: displayMessages,
    loading,
    sending,
    hasPastSession,
    pastMessages,
    pastLoading,
    load,
    loadPastMessages,
    sendMessage,
    sendImage,
    sendVideo,
    startThread,
  };
}
