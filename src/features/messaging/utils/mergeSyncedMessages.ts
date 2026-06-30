import type { ChatMessage } from '../types';
import { isMessageHydrationIncomplete, mergeHydratedMessage } from './enrichIncomingMessage';
import { capMessageList } from './messageWindow';

/** Poll / incremental sync — mevcut listeyi bozmadan yeni sunucu mesajlarını birleştirir. */
export function mergeSyncedMessages(
  prev: ChatMessage[],
  incoming: ChatMessage[],
): { next: ChatMessage[]; changed: boolean } {
  if (incoming.length === 0) return { next: prev, changed: false };

  const byId = new Map(prev.map((m) => [m.id, m]));
  let changed = false;

  for (const message of incoming) {
    const existing = byId.get(message.id);
    if (!existing) {
      byId.set(message.id, message);
      changed = true;
      continue;
    }
    if (isMessageHydrationIncomplete(existing, message)) {
      byId.set(message.id, mergeHydratedMessage(existing, message));
      changed = true;
    }
  }

  if (!changed) return { next: prev, changed: false };

  const merged = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { next: capMessageList(merged), changed: true };
}

export function applyReactionPatches(
  prev: ChatMessage[],
  withReactions: ChatMessage[],
): ChatMessage[] {
  if (withReactions.length === 0) return prev;

  const byId = new Map(withReactions.map((m) => [m.id, m]));
  let changed = false;
  const next = prev.map((m) => {
    const enriched = byId.get(m.id);
    if (!enriched?.reactions?.length || m.reactions?.length) return m;
    changed = true;
    return { ...m, reactions: enriched.reactions };
  });
  return changed ? next : prev;
}

/** FlatList extraData — içerik güncellemelerini kaçırmamak için son mesajların parmak izi. */
export function messageListRenderKey(messages: ChatMessage[]): string {
  if (messages.length === 0) return '0';
  const tail = messages.slice(-4);
  return `${messages.length}:${tail.map((m) => `${m.id}:${m.editedAt ?? ''}:${m.localStatus ?? ''}:${m.content.length}`).join('|')}`;
}
