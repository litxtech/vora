import { useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processQueuedItem } from '../services/queuedMessageActions';
import {
  getAllQueuedMessages,
  bumpQueueAttempt,
} from '../services/messageQueue';

export function useMessageQueue(
  userId: string | undefined,
  onSent?: (conversationId: string) => void,
) {
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!userId || flushingRef.current) return;
    flushingRef.current = true;

    try {
      const queue = await getAllQueuedMessages();
      for (const item of queue) {
        if (item.attempts >= 5) continue;

        const result = await processQueuedItem(item);
        if (result.ok) {
          onSent?.(item.conversationId);
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [userId, onSent]);

  useEffect(() => {
    void flush();
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flush();
    });
    return () => unsub();
  }, [flush]);

  return { flush };
}
