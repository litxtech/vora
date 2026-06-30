import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMyPremiumSupportThread,
  fetchPremiumSupportMessages,
  markPremiumSupportRead,
  sendPremiumSupportMessage,
  startPremiumSupportThread,
} from '@/features/premium-support/services/premiumSupportData';
import { uploadPremiumSupportImage } from '@/features/premium-support/services/premiumSupportMedia';
import { usePremiumSupportRealtime } from '@/features/premium-support/hooks/usePremiumSupportRealtime';
import {
  buildPremiumSupportMessage,
  mergePremiumSupportMessages,
} from '@/features/premium-support/utils/messageList';
import type {
  PremiumSupportMessage,
  PremiumSupportThread,
  PremiumSupportTopic,
} from '@/features/premium-support/types';
import { useAuth } from '@/providers/AuthProvider';

export function usePremiumSupportChat() {
  const { user } = useAuth();
  const [thread, setThread] = useState<PremiumSupportThread | null>(null);
  const [messages, setMessages] = useState<PremiumSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const knownMessageIdsRef = useRef(new Set<string>());

  const appendMessage = useCallback((message: PremiumSupportMessage) => {
    if (knownMessageIdsRef.current.has(message.id)) return;
    knownMessageIdsRef.current.add(message.id);
    setMessages((current) => [...current, message]);
  }, []);

  const refreshThread = useCallback(async () => {
    const nextThread = await fetchMyPremiumSupportThread();
    setThread(nextThread);
    return nextThread;
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const rows = await fetchPremiumSupportMessages(threadId);
    setMessages((current) => {
      const merged = mergePremiumSupportMessages(rows, current);
      knownMessageIdsRef.current = new Set(merged.map((row) => row.id));
      return merged;
    });
    await markPremiumSupportRead(threadId);
    setThread((current) => (current ? { ...current, user_unread_count: 0 } : current));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const nextThread = await refreshThread();
    if (nextThread) {
      await loadMessages(nextThread.id);
    } else {
      setMessages([]);
      knownMessageIdsRef.current.clear();
    }
    setLoading(false);
  }, [loadMessages, refreshThread]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!thread?.session_expires_at || thread.status === 'closed') return;

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

  usePremiumSupportRealtime({
    threadId: thread?.id ?? null,
    onNewMessage: (message) => {
      appendMessage(message);
      if (thread?.id) {
        void markPremiumSupportRead(thread.id);
      }
      void refreshThread();
    },
    onThreadUpdated: () => {
      void refreshThread();
    },
  });

  const startThread = useCallback(
    async (
      content: string,
      topic?: PremiumSupportTopic | null,
      options?: { messageType?: 'text' | 'image'; mediaUrl?: string | null },
    ) => {
      setSending(true);
      const { threadId, error } = await startPremiumSupportThread(content, topic, options);
      setSending(false);
      if (error || !threadId) return { error: error ?? 'Sohbet başlatılamadı' };

      await load();
      return { error: null };
    },
    [load],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      topic?: PremiumSupportTopic | null,
      options?: { messageType?: 'text' | 'image'; mediaUrl?: string | null },
    ) => {
      if (!thread?.id) {
        return startThread(content, topic, options);
      }

      setSending(true);
      const { messageId, error } = await sendPremiumSupportMessage(thread.id, content, options);
      setSending(false);
      if (error) return { error };

      if (messageId && user?.id) {
        appendMessage(
          buildPremiumSupportMessage({
            id: messageId,
            threadId: thread.id,
            senderId: user.id,
            content: content.trim(),
            messageType: options?.messageType,
            mediaUrl: options?.mediaUrl,
          }),
        );
      }

      await loadMessages(thread.id);
      await refreshThread();
      return { error: null };
    },
    [appendMessage, loadMessages, refreshThread, startThread, thread?.id, user?.id],
  );

  const sendImage = useCallback(
    async (localUri: string, caption = '', topic?: PremiumSupportTopic | null, mimeType?: string) => {
      if (!user?.id) return { error: 'Oturum bulunamadı' };

      setSending(true);
      const { url, error: uploadError } = await uploadPremiumSupportImage(user.id, localUri, mimeType);
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

  return {
    user,
    thread,
    messages,
    loading,
    sending,
    load,
    sendMessage,
    sendImage,
    startThread,
  };
}
