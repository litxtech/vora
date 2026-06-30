import { create } from 'zustand';

type PendingLiveSupportVideo = {
  uri: string;
  durationSec: number;
};

type LiveSupportPendingVideoState = {
  pending: PendingLiveSupportVideo | null;
  setPending: (video: PendingLiveSupportVideo) => void;
  consumePending: () => PendingLiveSupportVideo | null;
};

export const useLiveSupportPendingVideoStore = create<LiveSupportPendingVideoState>((set, get) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  consumePending: () => {
    const current = get().pending;
    set({ pending: null });
    return current;
  },
}));
