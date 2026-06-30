import type { ChatMessage } from '../types';

/** Sunucudan gelen listeyle birleştirir; gönderilmekte olan yerel mesajlar kaybolmaz. */
export function mergeServerMessages(
  serverMessages: ChatMessage[],
  prevMessages: ChatMessage[],
): ChatMessage[] {
  const pending = prevMessages.filter(
    (m) =>
      m.localOnly &&
      m.localStatus !== 'sent' &&
      m.localStatus !== 'read' &&
      (m.localStatus === 'sending' ||
        m.localStatus === 'failed' ||
        m.queued ||
        Boolean(m.uploadStage)),
  );

  if (pending.length === 0) return serverMessages;

  const merged = [...serverMessages];
  const knownIds = new Set(serverMessages.map((m) => m.id));

  for (const local of pending) {
    if (knownIds.has(local.id)) continue;
    merged.push(local);
  }

  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
