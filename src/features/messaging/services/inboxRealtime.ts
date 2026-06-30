import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { devWarn } from '@/lib/safeLog';
import type { IncomingMessageRow } from '../utils/inboxUpdates';

type ConversationUpdateRow = {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
};

type MessageInboxEventRow = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string | null;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  deleted_for_all?: boolean;
};

type InboxListener = {
  onMessage: (row: IncomingMessageRow) => void;
  onConversationUpdate: (row: ConversationUpdateRow) => void;
  onMemberUpdate?: () => void;
};

function inboxEventToIncomingRow(row: MessageInboxEventRow): IncomingMessageRow {
  return {
    id: row.message_id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    content: row.content,
    message_type: row.message_type,
    media_url: row.media_url,
    reply_to_id: row.reply_to_id,
    forwarded_from_id: row.forwarded_from_id,
    metadata: row.metadata,
    created_at: row.created_at,
    deleted_for_all: row.deleted_for_all,
  };
}

let channel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let setupPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<InboxListener>();

async function teardownChannel(): Promise<void> {
  if (!channel) return;
  const stale = channel;
  channel = null;
  activeUserId = null;
  await supabase.removeChannel(stale);
}

function scheduleInboxRetry(userId: string): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (listeners.size === 0) return;
    void ensureInboxChannel(userId, true).catch(() => undefined);
  }, 3000);
}

async function ensureInboxChannel(userId: string, isRetry = false): Promise<void> {
  if (channel && activeUserId === userId && !isRetry) return;

  if (setupPromise) {
    await setupPromise;
    if (channel && activeUserId === userId && !isRetry) return;
  }

  setupPromise = (async () => {
    await teardownChannel();

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      await supabase.realtime.setAuth(sessionData.session.access_token);
    }

    const next = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_inbox_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = inboxEventToIncomingRow(payload.new as MessageInboxEventRow);
          for (const listener of listeners) listener.onMessage(incoming);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          for (const listener of listeners) listener.onMemberUpdate?.();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as ConversationUpdateRow;
          for (const listener of listeners) listener.onConversationUpdate(row);
        },
      );

    channel = next;
    activeUserId = userId;

    await new Promise<void>((resolve, reject) => {
      next.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          resolve();
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(err ?? new Error(`inbox realtime: ${status}`));
        }
      });
    });
  })();

  try {
    await setupPromise;
  } catch (err) {
    devWarn('messaging', 'Inbox realtime aboneliği başarısız', {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
    scheduleInboxRetry(userId);
  } finally {
    setupPromise = null;
  }
}

export function subscribeInboxRealtime(userId: string, listener: InboxListener): () => void {
  listeners.add(listener);
  void ensureInboxChannel(userId).catch(() => undefined);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      void teardownChannel();
    }
  };
}
