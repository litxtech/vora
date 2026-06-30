import type { ChatMessage } from '../types';
import type { QueuedMessage } from '../services/messageQueue';

function hasRemoteMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function isPendingOutgoingMessage(message: ChatMessage, userId?: string | null): boolean {
  if (!userId || message.senderId !== userId) return false;
  if (message.deletedForAll) return false;
  if (message.queued && message.messageType === 'video' && hasRemoteMediaUrl(message.mediaUrl)) {
    return message.localStatus === 'failed';
  }
  return Boolean(
    message.queued ||
      message.localStatus === 'failed' ||
      (message.localStatus === 'sending' && (message.localOnly || message.id.startsWith('queue-'))),
  );
}

export function mapQueuedToChatMessage(item: QueuedMessage): ChatMessage {
  return {
    id: item.id,
    conversationId: item.conversationId,
    senderId: item.senderId,
    content: item.content,
    mediaUrl: item.mediaUrl ?? item.localUri ?? null,
    messageType: item.messageType,
    replyToId: item.replyToId ?? null,
    editedAt: null,
    deletedForAll: false,
    isRead: false,
    createdAt: item.createdAt,
    localStatus: item.attempts >= 5 ? 'failed' : 'sending',
    localOnly: true,
    queued: true,
    localMediaUri: item.localUri ?? null,
    metadata: (item.metadata as ChatMessage['metadata']) ?? null,
  };
}

export function isServerPersistedMessage(message: ChatMessage): boolean {
  return (
    !message.localOnly &&
    !message.queued &&
    !message.id.startsWith('queue-') &&
    !message.id.startsWith('local-')
  );
}

/** Poll / fetchMessagesAfter için — bekleyen yerel mesajlar cursor'ı bozmaz. */
export function maxServerMessageCreatedAt(messages: ChatMessage[]): string | null {
  let max: string | null = null;
  for (const message of messages) {
    if (!isServerPersistedMessage(message)) continue;
    if (!max || message.createdAt > max) max = message.createdAt;
  }
  return max;
}
