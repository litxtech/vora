import { create } from 'zustand';
import { getFeedDrawerCloseDurationMs } from '@/lib/device/androidPerfProfile';

type InteractionLockHandler = ((locked: boolean) => void) | null;

let unlockSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearDrawerUnlockSafety() {
  if (!unlockSafetyTimer) return;
  clearTimeout(unlockSafetyTimer);
  unlockSafetyTimer = null;
}

function scheduleDrawerUnlockSafety(get: () => FeedDrawerState) {
  if (unlockSafetyTimer) clearTimeout(unlockSafetyTimer);
  // Android: withTiming finished=false olunca kilit kalabiliyor — süre + pay.
  unlockSafetyTimer = setTimeout(() => {
    unlockSafetyTimer = null;
    if (!get().open) {
      get().forceUnlockInteractions();
    }
  }, getFeedDrawerCloseDurationMs() + 160);
}

type FeedDrawerState = {
  open: boolean;
  listInteractionLocked: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setListInteractionLockHandler: (handler: InteractionLockHandler) => void;
  setFeedShellLockHandler: (handler: InteractionLockHandler) => void;
  setListInteractionLocked: (locked: boolean) => void;
  forceUnlockInteractions: () => void;
  _listInteractionLockHandler: InteractionLockHandler;
  _feedShellLockHandler: InteractionLockHandler;
};

export const useFeedDrawerStore = create<FeedDrawerState>((set, get) => ({
  open: false,
  listInteractionLocked: false,
  openDrawer: () => {
    clearDrawerUnlockSafety();
    set({ open: true });
  },
  closeDrawer: () => {
    set({ open: false });
    scheduleDrawerUnlockSafety(get);
  },
  toggleDrawer: () => {
    if (get().open) {
      get().closeDrawer();
      return;
    }
    get().openDrawer();
  },
  _listInteractionLockHandler: null,
  _feedShellLockHandler: null,
  setListInteractionLockHandler: (handler) => set({ _listInteractionLockHandler: handler }),
  setFeedShellLockHandler: (handler) => set({ _feedShellLockHandler: handler }),
  setListInteractionLocked: (locked) => {
    if (get().listInteractionLocked === locked) return;
    set({ listInteractionLocked: locked });
    if (!locked) {
      clearDrawerUnlockSafety();
    }
    get()._listInteractionLockHandler?.(locked);
    get()._feedShellLockHandler?.(locked);
  },
  forceUnlockInteractions: () => {
    clearDrawerUnlockSafety();
    set({ listInteractionLocked: false });
    get()._listInteractionLockHandler?.(false);
    get()._feedShellLockHandler?.(false);
  },
}));
