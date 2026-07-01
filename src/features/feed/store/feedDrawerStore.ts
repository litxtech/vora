import { create } from 'zustand';

type ListInteractionLockHandler = ((locked: boolean) => void) | null;

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
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  toggleDrawer: () => set((state) => ({ open: !state.open })),
  _listInteractionLockHandler: null,
  setListInteractionLockHandler: (handler) => set({ _listInteractionLockHandler: handler }),
  setListInteractionLocked: (locked) => {
    if (get().listInteractionLocked === locked) return;
    set({ listInteractionLocked: locked });
    get()._listInteractionLockHandler?.(locked);
  },
}));
