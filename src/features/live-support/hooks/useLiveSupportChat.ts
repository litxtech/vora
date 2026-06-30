import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const knownMessageIdsRef = useRef(new Set<string>());

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
      if (nextThread) {
        await loadMessages(nextThread.id);
      } else {
        setMessages([]);
        knownMessageIdsRef.current.clear();
      }
      if (!silent) setLoading(false);
    },
    [loadMessages, refreshThread],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!thread?.session_expires_at || ['closed', 'resolved', 'no_response'].includes(thread.status)) return;

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

  const startThread = useCallback(
    async (
      content: string,
      topic?: LiveSupportTopic | null,
      options?: { messageType?: LiveSupportMessageType; mediaUrl?: string | null },
    ) => {
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
      await refreshThread();
      return { error: null };
    },
    [appendMessage, loadMessages, refreshThread, user?.id],
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
      void refreshThread();
      return { error: null };
    },
    [appendMessage, loadMessages, refreshThread, startThread, thread?.id, user?.id],
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
    messages,
    loading,
    sending,
    load,
    sendMessage,
    sendImage,
    sendVideo,
    startThread,
  };
}
