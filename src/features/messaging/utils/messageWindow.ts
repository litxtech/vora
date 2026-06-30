import { CHAT_MEMORY_MESSAGE_CAP } from '../constants';
import type { ChatMessage } from '../types';

/** Bellekte tutulacak maksimum mesaj — en yeniler korunur. */
export function capMessageList(
  messages: ChatMessage[],
  pinIds?: Iterable<string>,
  cap = CHAT_MEMORY_MESSAGE_CAP,
): ChatMessage[] {
  if (messages.length <= cap) return messages;

  const pin = pinIds ? new Set(pinIds) : null;
  if (!pin?.size) {
    return messages.slice(-cap);
  }

  const pinned = messages.filter((m) => pin.has(m.id));
  const unpinned = messages.filter((m) => !pin.has(m.id));
  const slotsForUnpinned = Math.max(cap - pinned.length, 0);
  const keptUnpinned =
    slotsForUnpinned >= unpinned.length ? unpinned : unpinned.slice(-slotsForUnpinned);

  const merged = [...keptUnpinned, ...pinned].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const seen = new Set<string>();
  return merged.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export function didTrimMessageWindow(before: ChatMessage[], after: ChatMessage[]): boolean {
  return after.length < before.length;
}
