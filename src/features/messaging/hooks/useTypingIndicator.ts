import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { removeSupabaseChannelsByPrefix } from '@/lib/supabase/realtimeChannel';
import type { ChatActivity } from '../types';
import { useMessagingStore } from '../store/messagingStore';

type UseTypingIndicatorOptions = {
  conversationId: string | null;
  currentUserId: string | null;
};

export function useTypingIndicator({ conversationId, currentUserId }: UseTypingIndicatorOptions) {
  const setTyping = useMessagingStore((s) => s.setTyping);
  const setActivity = useMessagingStore((s) => s.setActivity);
  const typingUserId = useMessagingStore((s) =>
    conversationId ? s.typingByConversation[conversationId] : null,
  );
  const remoteActivity = useMessagingStore((s) =>
    conversationId ? s.activityByConversation[conversationId] : null,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = `typing-${conversationId}`;

    void (async () => {
      await removeSupabaseChannelsByPrefix(channelName);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'activity' }, ({ payload }) => {
          const data = payload as { userId?: string; activity?: ChatActivity };
          if (!data.userId || data.userId === currentUserId || !data.activity) return;
          setActivity(conversationId, { userId: data.userId, activity: data.activity });
          setTyping(conversationId, data.userId);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setTyping(conversationId, null);
            setActivity(conversationId, null);
          }, 3000);
        })
        .subscribe();

      if (cancelled && channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTyping(conversationId, null);
      setActivity(conversationId, null);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, setTyping, setActivity]);

  const broadcastActivity = useCallback(
    (activity: ChatActivity) => {
      if (!conversationId || !currentUserId) return;
      const channel = supabase.channel(`typing-${conversationId}`);
      channel.send({
        type: 'broadcast',
        event: 'activity',
        payload: { userId: currentUserId, activity },
      });
    },
    [conversationId, currentUserId],
  );

  return { typingUserId, remoteActivity, broadcastActivity };
}
