import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import {
  expireEphemeralImageMessage,
  isEphemeralImageExpired,
  isEphemeralMediaMessage,
  resolveEphemeralExpiryAtMs,
} from '../services/ephemeralImage';

type UseEphemeralMessageExpiryOptions = {
  messages: ChatMessage[];
  viewerId: string | null | undefined;
  viewedAtByMessageId: Record<string, number>;
  onExpired: (messageId: string) => void;
};

export function useEphemeralMessageExpiry({
  messages,
  viewerId,
  viewedAtByMessageId,
  onExpired,
}: UseEphemeralMessageExpiryOptions) {
  const onExpiredRef = useRef(onExpired);
  const firedRef = useRef(new Set<string>());

  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!viewerId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const message of messages) {
      if (!isEphemeralMediaMessage(message) || isEphemeralImageExpired(message)) continue;
      // Henüz sunucuya yazılmamış (yükleniyor/kuyrukta) mesajların süresi başlamasın —
      // aksi halde uzun süren video yüklemesinde mesaj gönderilmeden silinebilir.
      if (message.localOnly || message.queued || message.localStatus === 'sending') continue;
      if (firedRef.current.has(message.id)) continue;

      const expiryAt = resolveEphemeralExpiryAtMs(
        message,
        viewerId,
        viewedAtByMessageId[message.id],
      );
      if (!expiryAt) continue;

      const fire = () => {
        if (firedRef.current.has(message.id)) return;
        firedRef.current.add(message.id);
        void expireEphemeralImageMessage(message.id).finally(() => {
          onExpiredRef.current(message.id);
        });
      };

      const delay = expiryAt - Date.now();
      if (delay <= 0) {
        fire();
      } else {
        timers.push(setTimeout(fire, delay));
      }
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [messages, viewerId, viewedAtByMessageId]);
}
