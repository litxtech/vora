import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { removeSupabaseChannelsByPrefix } from '@/lib/supabase/realtimeChannel';
import type { PremiumSupportMessage } from '@/features/premium-support/types';

type DbPremiumSupportMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  media_url?: string | null;
  created_at: string;
};

type UsePremiumSupportRealtimeOptions = {
  threadId: string | null;
  onNewMessage: (message: PremiumSupportMessage) => void;
  onThreadUpdated?: () => void;
};

export function usePremiumSupportRealtime({
  threadId,
  onNewMessage,
  onThreadUpdated,
}: UsePremiumSupportRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  const onThreadUpdatedRef = useRef(onThreadUpdated);

  onNewMessageRef.current = onNewMessage;
  onThreadUpdatedRef.current = onThreadUpdated;

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;
    const channelName = `premium-support-${threadId}`;
    let channel: RealtimeChannel | null = null;

    const subscribe = async () => {
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      await removeSupabaseChannelsByPrefix(channelName);
      if (cancelled) return;

      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionData.session?.access_token) {
        await supabase.realtime.setAuth(sessionData.session.access_token);
      }

      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'premium_support_messages',
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new as DbPremiumSupportMessageRow;
            onNewMessageRef.current({
              id: row.id,
              thread_id: row.thread_id,
              sender_id: row.sender_id,
              content: row.content,
              message_type: row.message_type === 'image' ? 'image' : 'text',
              media_url: row.media_url ?? null,
              created_at: row.created_at,
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'premium_support_threads',
            filter: `id=eq.${threadId}`,
          },
          () => {
            onThreadUpdatedRef.current?.();
          },
        )
        .subscribe();
    };

    void subscribe();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session?.access_token) return;
      void supabase.realtime.setAuth(session.access_token).then(() => {
        if (!cancelled) void subscribe();
      });
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
      if (channel) {
        void supabase.removeChannel(channel);
      }
      void removeSupabaseChannelsByPrefix(channelName);
    };
  }, [threadId]);
}
