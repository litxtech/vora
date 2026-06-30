import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  removeSupabaseChannelsByPrefix,
  subscribeSupabaseChannel,
} from '@/lib/supabase/realtimeChannel';
import { mapLiveSupportMessageType } from '@/features/live-support/utils/messageList';
import type { LiveSupportMessage } from '@/features/live-support/types';

type DbLiveSupportMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  media_url?: string | null;
  created_at: string;
};

type UseLiveSupportRealtimeOptions = {
  threadId: string | null;
  onNewMessage: (message: LiveSupportMessage) => void;
  onThreadUpdated?: () => void;
};

export function useLiveSupportRealtime({
  threadId,
  onNewMessage,
  onThreadUpdated,
}: UseLiveSupportRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  const onThreadUpdatedRef = useRef(onThreadUpdated);
  const lastAuthTokenRef = useRef<string | null>(null);

  onNewMessageRef.current = onNewMessage;
  onThreadUpdatedRef.current = onThreadUpdated;

  useEffect(() => {
    if (!threadId) return;

    lastAuthTokenRef.current = null;
    let cancelled = false;
    const channelName = `live-support-${threadId}`;
    let channel: RealtimeChannel | null = null;
    let subscribeChain = Promise.resolve();

    const subscribe = () => {
      subscribeChain = subscribeChain
        .then(async () => {
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

          channel = await subscribeSupabaseChannel(channelName, (ch) =>
            ch
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'live_support_messages',
                  filter: `thread_id=eq.${threadId}`,
                },
                (payload) => {
                  const row = payload.new as DbLiveSupportMessageRow;
                  onNewMessageRef.current({
                    id: row.id,
                    thread_id: row.thread_id,
                    sender_id: row.sender_id,
                    content: row.content,
                    message_type: mapLiveSupportMessageType(row.message_type),
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
                  table: 'live_support_threads',
                  filter: `id=eq.${threadId}`,
                },
                () => {
                  onThreadUpdatedRef.current?.();
                },
              ),
          );
        })
        .catch(() => undefined);
    };

    subscribe();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token;
      if (cancelled || !token || token === lastAuthTokenRef.current) return;
      lastAuthTokenRef.current = token;
      void supabase.realtime.setAuth(token).then(() => {
        if (!cancelled) subscribe();
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
