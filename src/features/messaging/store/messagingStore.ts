import { create } from 'zustand';
import { dismissConversationNotifications } from '@/lib/notifications/conversationNotificationDismiss';
import type { ChatActivity, ChatMessage, ConversationDetail, ConversationListItem } from '../types';

/** Bellekte tutulacak azami sohbet önbelleği — disk cache ayrı (20). */
const MAX_CACHED_CONVERSATIONS = 15;

const conversationTouchOrder: string[] = [];

function touchCachedConversation(conversationId: string): void {
  const idx = conversationTouchOrder.indexOf(conversationId);
  if (idx >= 0) conversationTouchOrder.splice(idx, 1);
  conversationTouchOrder.push(conversationId);
}

function pruneConversationCaches(
  messagesByConversationId: Record<string, ChatMessage[]>,
  conversationDetailById: Record<string, ConversationDetail>,
  protectedIds: Set<string>,
): {
  messagesByConversationId: Record<string, ChatMessage[]>;
  conversationDetailById: Record<string, ConversationDetail>;
} {
  const ids = Object.keys(messagesByConversationId);
  if (ids.length <= MAX_CACHED_CONVERSATIONS) {
    return { messagesByConversationId, conversationDetailById };
  }

  let nextMessages = { ...messagesByConversationId };
  let nextDetails = { ...conversationDetailById };

  while (Object.keys(nextMessages).length > MAX_CACHED_CONVERSATIONS) {
    const victim =
      conversationTouchOrder.find((id) => nextMessages[id] && !protectedIds.has(id)) ??
      Object.keys(nextMessages).find((id) => !protectedIds.has(id));
    if (!victim) break;

    const { [victim]: _m, ...restMessages } = nextMessages;
    const { [victim]: _d, ...restDetails } = nextDetails;
    nextMessages = restMessages;
    nextDetails = restDetails;

    const touchIdx = conversationTouchOrder.indexOf(victim);
    if (touchIdx >= 0) conversationTouchOrder.splice(touchIdx, 1);
  }

  return { messagesByConversationId: nextMessages, conversationDetailById: nextDetails };
}

type ConversationActivity = {
  userId: string;
  activity: ChatActivity;
} | null;

type MessagingState = {
  /** Mesaj sekmesi rozeti — açık / tıklanmış sohbetler hariç. */
  totalUnread: number;
  conversationUnreadById: Record<string, number>;
  /** Kullanıcı sohbete girdi — sunucu gecikse bile rozet geri gelmez; yeni mesaj gelince sıfırlanır. */
  clearedConversationIds: Record<string, true>;
  activeConversationId: string | null;
  setUnreadFromConversations: (list: ConversationListItem[]) => void;
  /** Sohbet satırına tıklanınca — rozet ve bildirim anında kalkar. */
  enterConversation: (conversationId: string, unreadHint?: number) => void;
  leaveConversation: () => void;
  acknowledgeConversationRead: (conversationId: string) => void;
  clearConversationUnread: (conversationId: string) => void;
  incrementConversationUnread: (conversationId: string, delta?: number) => void;
  getDisplayUnread: (conversationId: string, serverUnread?: number) => number;
  openConversation: (conversationId: string, unreadHint?: number) => void;
  closeConversation: () => void;
  setActiveConversationId: (id: string | null) => void;
  typingByConversation: Record<string, string | null>;
  setTyping: (conversationId: string, userId: string | null) => void;
  activityByConversation: Record<string, ConversationActivity>;
  setActivity: (conversationId: string, activity: ConversationActivity) => void;
  /** Oturum içi sohbet önbelleği — tekrar girince anında gösterilir. */
  messagesByConversationId: Record<string, ChatMessage[]>;
  conversationDetailById: Record<string, ConversationDetail>;
  getCachedMessages: (conversationId: string) => ChatMessage[];
  setCachedMessages: (conversationId: string, messages: ChatMessage[]) => void;
  getCachedConversationDetail: (conversationId: string) => ConversationDetail | undefined;
  setCachedConversationDetail: (conversationId: string, detail: ConversationDetail) => void;
  clearCachedConversation: (conversationId: string) => void;
  /** Sohbet composer taslakları — WhatsApp tarzı kalıcı. */
  draftByConversationId: Record<string, string>;
  draftsHydrated: boolean;
  setDraftMap: (drafts: Record<string, string>) => void;
  markDraftsHydrated: (hydrated?: boolean) => void;
};

function isUnreadSuppressed(
  conversationId: string,
  activeConversationId: string | null,
  clearedConversationIds: Record<string, true>,
): boolean {
  return (
    activeConversationId === conversationId || clearedConversationIds[conversationId] === true
  );
}

function snapshotUnread(
  list: ConversationListItem[],
  activeConversationId: string | null,
  clearedConversationIds: Record<string, true>,
) {
  const conversationUnreadById: Record<string, number> = {};
  let totalUnread = 0;
  for (const item of list) {
    const unread = isUnreadSuppressed(item.id, activeConversationId, clearedConversationIds)
      ? 0
      : item.unreadCount;
    conversationUnreadById[item.id] = unread;
    totalUnread += unread;
  }
  return { totalUnread, conversationUnreadById };
}

function shallowEqualUnreadMap(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  totalUnread: 0,
  conversationUnreadById: {},
  clearedConversationIds: {},
  activeConversationId: null,

  setUnreadFromConversations: (list) => {
    const { activeConversationId, clearedConversationIds, conversationUnreadById } = get();
    const serverSnapshot = snapshotUnread(list, activeConversationId, clearedConversationIds);

    // Realtime ile artırılan yerel sayı, sunucu gecikse bile düşmesin.
    const mergedById = { ...serverSnapshot.conversationUnreadById };
    for (const [conversationId, localCount] of Object.entries(conversationUnreadById)) {
      if (isUnreadSuppressed(conversationId, activeConversationId, clearedConversationIds)) {
        continue;
      }
      const serverCount = mergedById[conversationId] ?? 0;
      if (localCount > serverCount) {
        mergedById[conversationId] = localCount;
      }
    }

    let totalUnread = 0;
    for (const count of Object.values(mergedById)) {
      totalUnread += count;
    }

    const next = { totalUnread, conversationUnreadById: mergedById };
    set((state) =>
      state.totalUnread === next.totalUnread &&
      shallowEqualUnreadMap(state.conversationUnreadById, next.conversationUnreadById)
        ? state
        : next,
    );
  },

  getDisplayUnread: (conversationId, serverUnread = 0) => {
    const state = get();
    if (isUnreadSuppressed(conversationId, state.activeConversationId, state.clearedConversationIds)) {
      return 0;
    }
    return state.conversationUnreadById[conversationId] ?? serverUnread;
  },

  enterConversation: (conversationId, unreadHint) => {
    set((state) => {
      const prevUnread = Math.max(
        state.conversationUnreadById[conversationId] ?? 0,
        unreadHint ?? 0,
      );
      return {
        activeConversationId: conversationId,
        clearedConversationIds: {
          ...state.clearedConversationIds,
          [conversationId]: true,
        },
        conversationUnreadById: {
          ...state.conversationUnreadById,
          [conversationId]: 0,
        },
        totalUnread: Math.max(0, state.totalUnread - prevUnread),
      };
    });
    void dismissConversationNotifications(conversationId);
  },

  leaveConversation: () => {
    const prevActive = get().activeConversationId;
    if (!prevActive) {
      set({ activeConversationId: null });
      return;
    }
    set((state) => {
      const { [prevActive]: _removed, ...restCleared } = state.clearedConversationIds;
      return {
        activeConversationId: null,
        clearedConversationIds: restCleared,
      };
    });
  },

  acknowledgeConversationRead: (conversationId) => {
    set((state) => ({
      clearedConversationIds: {
        ...state.clearedConversationIds,
        [conversationId]: true,
      },
      conversationUnreadById: {
        ...state.conversationUnreadById,
        [conversationId]: 0,
      },
      totalUnread:
        state.activeConversationId === conversationId ||
        (state.conversationUnreadById[conversationId] ?? 0) === 0
          ? state.totalUnread
          : Math.max(0, state.totalUnread - (state.conversationUnreadById[conversationId] ?? 0)),
    }));
  },

  clearConversationUnread: (conversationId) => {
    get().acknowledgeConversationRead(conversationId);
  },

  incrementConversationUnread: (conversationId, delta = 1) => {
    set((state) => {
      if (state.activeConversationId === conversationId) return state;

      const { [conversationId]: _removed, ...restCleared } = state.clearedConversationIds;
      const current = state.conversationUnreadById[conversationId] ?? 0;
      return {
        clearedConversationIds: restCleared,
        conversationUnreadById: {
          ...state.conversationUnreadById,
          [conversationId]: current + delta,
        },
        totalUnread: state.totalUnread + delta,
      };
    });
  },

  openConversation: (conversationId, unreadHint) => {
    get().enterConversation(conversationId, unreadHint);
  },

  closeConversation: () => {
    get().leaveConversation();
  },

  setActiveConversationId: (id) => {
    if (id) {
      const state = get();
      if (state.activeConversationId === id) return;
      const unread = state.conversationUnreadById[id] ?? 0;
      get().enterConversation(id, unread > 0 ? unread : undefined);
      return;
    }
    get().leaveConversation();
  },

  typingByConversation: {},
  setTyping: (conversationId, userId) =>
    set((state) => ({
      typingByConversation: { ...state.typingByConversation, [conversationId]: userId },
    })),
  activityByConversation: {},
  setActivity: (conversationId, activity) =>
    set((state) => ({
      activityByConversation: { ...state.activityByConversation, [conversationId]: activity },
    })),

  messagesByConversationId: {},
  conversationDetailById: {},

  getCachedMessages: (conversationId) => get().messagesByConversationId[conversationId] ?? [],

  setCachedMessages: (conversationId, messages) =>
    set((state) => {
      touchCachedConversation(conversationId);
      const protectedIds = new Set<string>();
      if (state.activeConversationId) protectedIds.add(state.activeConversationId);

      const merged = {
        ...state.messagesByConversationId,
        [conversationId]: messages,
      };
      const pruned = pruneConversationCaches(
        merged,
        state.conversationDetailById,
        protectedIds,
      );
      return { messagesByConversationId: pruned.messagesByConversationId };
    }),

  getCachedConversationDetail: (conversationId) =>
    get().conversationDetailById[conversationId],

  setCachedConversationDetail: (conversationId, detail) =>
    set((state) => {
      touchCachedConversation(conversationId);
      const protectedIds = new Set<string>();
      if (state.activeConversationId) protectedIds.add(state.activeConversationId);

      const mergedDetails = {
        ...state.conversationDetailById,
        [conversationId]: detail,
      };
      const pruned = pruneConversationCaches(
        state.messagesByConversationId,
        mergedDetails,
        protectedIds,
      );
      return { conversationDetailById: pruned.conversationDetailById };
    }),

  clearCachedConversation: (conversationId) =>
    set((state) => {
      const touchIdx = conversationTouchOrder.indexOf(conversationId);
      if (touchIdx >= 0) conversationTouchOrder.splice(touchIdx, 1);

      const { [conversationId]: _messages, ...restMessages } = state.messagesByConversationId;
      const { [conversationId]: _detail, ...restDetails } = state.conversationDetailById;
      return {
        messagesByConversationId: restMessages,
        conversationDetailById: restDetails,
      };
    }),

  draftByConversationId: {},
  draftsHydrated: false,

  setDraftMap: (drafts) =>
    set((state) => {
      const prev = state.draftByConversationId;
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(drafts);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((key) => prev[key] === drafts[key])
      ) {
        return state;
      }
      return { draftByConversationId: drafts };
    }),

  markDraftsHydrated: (hydrated = true) =>
    set((state) => (state.draftsHydrated === hydrated ? state : { draftsHydrated: hydrated })),
}));
