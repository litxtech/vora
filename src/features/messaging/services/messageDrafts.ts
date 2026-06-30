import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMessagingStore } from '../store/messagingStore';

const storageKey = (userId: string) => `messaging:drafts:v1:${userId}`;

let activeUserId: string | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let hydratePromise: Promise<void> | null = null;

function schedulePersist(userId: string, drafts: Record<string, string>) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void AsyncStorage.setItem(storageKey(userId), JSON.stringify(drafts));
  }, 280);
}

export async function hydrateMessageDrafts(userId: string): Promise<void> {
  if (activeUserId === userId && useMessagingStore.getState().draftsHydrated) {
    return hydratePromise ?? Promise.resolve();
  }

  if (hydratePromise && activeUserId === userId) {
    return hydratePromise;
  }

  activeUserId = userId;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const drafts: Record<string, string> = {};
      for (const [conversationId, text] of Object.entries(parsed)) {
        if (typeof text === 'string' && text.trim()) {
          drafts[conversationId] = text;
        }
      }
      useMessagingStore.getState().setDraftMap(drafts);
    } catch {
      useMessagingStore.getState().setDraftMap({});
    } finally {
      useMessagingStore.getState().markDraftsHydrated();
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function getMessageDraft(conversationId: string): string {
  return useMessagingStore.getState().draftByConversationId[conversationId] ?? '';
}

export function setMessageDraft(userId: string, conversationId: string, text: string): void {
  const store = useMessagingStore.getState();
  const next = { ...store.draftByConversationId };

  if (!text.trim()) {
    if (!(conversationId in next)) return;
    delete next[conversationId];
  } else {
    if (next[conversationId] === text) return;
    next[conversationId] = text;
  }

  store.setDraftMap(next);
  schedulePersist(userId, next);
}

export function clearMessageDraft(userId: string, conversationId: string): void {
  setMessageDraft(userId, conversationId, '');
}

export function resetMessageDraftsForUser(): void {
  activeUserId = null;
  hydratePromise = null;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  useMessagingStore.getState().setDraftMap({});
  useMessagingStore.getState().markDraftsHydrated(false);
}
