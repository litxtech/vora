import { create } from 'zustand';
import { getFeedDrawerCloseDurationMs } from '@/lib/device/androidPerfProfile';

type ListInteractionLockHandler = ((locked: boolean) => void) | null;

let unlockSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDrawerUnlockSafety(get: () => FeedDrawerState) {
  if (unlockSafetyTimer) clearTimeout(unlockSafetyTimer);
  unlockSafetyTimer = setTimeout(() => {
    unlockSafetyTimer = null;
    if (!get().open) {
      get().setListInteractionLocked(false);
    }
  }, getFeedDrawerCloseDurationMs() + 80);
}

function clearDrawerUnlockSafety() {
  if (!unlockSafetyTimer) return;
  clearTimeout(unlockSafetyTimer);
  unlockSafetyTimer = null;
}

type FeedDrawerState = {
  open: boolean;
  listInteractionLocked: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setListInteractionLockHandler: (handler: ListInteractionLockHandler) => void;
  setListInteractionLocked: (locked: boolean) => void;
  _listInteractionLockHandler: ListInteractionLockHandler;
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
  setListInteractionLockHandler: (handler) => set({ _listInteractionLockHandler: handler }),
  setListInteractionLocked: (locked) => {
    if (get().listInteractionLocked === locked) return;
    set({ listInteractionLocked: locked });
    if (!locked) {
      clearDrawerUnlockSafety();
    }
    get()._listInteractionLockHandler?.(locked);
  },
}));
