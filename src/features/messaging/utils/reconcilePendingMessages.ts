import type { ChatMessage } from '../types';
import { capMessageList } from './messageWindow';
import type { QueuedMessage } from '../services/messageQueue';
import { mapQueuedToChatMessage } from './pendingMessage';

const PENDING_MATCH_MS = 5 * 60 * 1000;

function messageTime(iso: string): number {
  return new Date(iso).getTime();
}

function normalizeMediaKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) return null;
  return trimmed.split('?')[0] ?? null;
}

export function hasRemoteMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

/** Kuyruk/yerel mesaj sunucuda zaten varsa tekrar gösterme. */
export function isRedundantPendingMessage(local: ChatMessage, server: ChatMessage): boolean {
  if (!local.localOnly && !local.queued) return false;
  if (local.senderId !== server.senderId) return false;
  if (local.messageType !== server.messageType) return false;
  if (local.deletedForAll || server.deletedForAll) return false;

  const dt = Math.abs(messageTime(local.createdAt) - messageTime(server.createdAt));
  if (dt > PENDING_MATCH_MS) return false;

  const localRemote = normalizeMediaKey(local.mediaUrl);
  const serverRemote = normalizeMediaKey(server.mediaUrl);
  if (localRemote && serverRemote && localRemote === serverRemote) return true;

  if (local.messageType === 'video' || local.messageType === 'image') {
    return !local.content && !server.content;
  }

  if (local.content && server.content && local.content === server.content) return true;
  return false;
}

export function filterRedundantPending(
  serverMessages: ChatMessage[],
  pendingMessages: ChatMessage[],
): ChatMessage[] {
  return pendingMessages.filter(
    (local) => !serverMessages.some((server) => isRedundantPendingMessage(local, server)),
  );
}

export function matchesQueuedToServer(item: QueuedMessage, server: ChatMessage): boolean {
  return isRedundantPendingMessage(mapQueuedToChatMessage(item), server);
}

function isActivePending(message: ChatMessage): boolean {
  return (
    Boolean(message.localOnly) &&
    message.localStatus !== 'sent' &&
    message.localStatus !== 'read' &&
    (message.localStatus === 'sending' ||
      message.localStatus === 'failed' ||
      Boolean(message.queued) ||
      Boolean(message.uploadStage))
  );
}

/** Sohbet açılışında sunucu + aktif yerel/kuyruk mesajlarını birleştirir. */
export function mergeMessagesForConversationLoad(
  serverMessages: ChatMessage[],
  prevMessages: ChatMessage[],
  queuedMessages: ChatMessage[],
): ChatMessage[] {
  const pendingFromPrev = prevMessages.filter(isActivePending);
  const pending = filterRedundantPending(serverMessages, [...pendingFromPrev, ...queuedMessages]);
  const knownIds = new Set(serverMessages.map((m) => m.id));
  const recentFromPrev = prevMessages.filter(
    (m) =>
      !knownIds.has(m.id) &&
      !isActivePending(m) &&
      !m.localOnly &&
      !m.queued &&
      !m.id.startsWith('local-') &&
      !m.id.startsWith('queue-'),
  );
  const extras = [
    ...pending.filter((m) => !knownIds.has(m.id)),
    ...recentFromPrev.filter((m) => !knownIds.has(m.id)),
  ];

  const merged = [...serverMessages, ...extras].sort(
    (a, b) => messageTime(a.createdAt) - messageTime(b.createdAt),
  );

  const seen = new Set<string>();
  const deduped = merged.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
  return capMessageList(deduped);
}

/** Video kuyruk overlay — yükleme bitmiş, yalnızca gönderim bekliyorsa gösterme. */
export function shouldShowQueuedVideoOverlay(message: ChatMessage): boolean {
  if (!message.queued) return false;
  if (message.messageType !== 'video') return true;
  if (message.uploadStage) return false;
  if (hasRemoteMediaUrl(message.mediaUrl)) return false;
  return true;
}
