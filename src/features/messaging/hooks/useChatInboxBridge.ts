import { useEffect, useRef } from 'react';
import { subscribeInboxRealtime } from '../services/inboxRealtime';
import type { IncomingMessageRow } from '../utils/inboxUpdates';

/** chat-* kanalı kaçırırsa inbox INSERT ile aynı sohbeti dinler. */
export function useChatInboxBridge(
  conversationId: string | null,
  currentUserId: string | null,
  onIncoming: (row: IncomingMessageRow) => void,
): void {
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    return subscribeInboxRealtime(currentUserId, {
      onMessage: (row) => {
        if (row.conversation_id !== conversationId) return;
        onIncomingRef.current(row);
      },
      onConversationUpdate: () => undefined,
    });
  }, [conversationId, currentUserId]);
}
