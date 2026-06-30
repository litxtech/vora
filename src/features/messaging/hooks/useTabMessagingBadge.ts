import { useMessagingStore } from '../store/messagingStore';

/** Tab badge unread count. */
export function useTabMessagingBadge(): number {
  return useMessagingStore((state) => state.totalUnread);
}
