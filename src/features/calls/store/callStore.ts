import { create } from 'zustand';
import type { CallMediaState, CallSession } from '../types';

type CallStore = {
  session: CallSession | null;
  media: CallMediaState;
  isJoined: boolean;
  setSession: (session: CallSession | null) => void;
  patchSession: (patch: Partial<CallSession>) => void;
  setMedia: (patch: Partial<CallMediaState>) => void;
  setJoined: (joined: boolean) => void;
  reset: () => void;
};

const initialMedia: CallMediaState = {
  isMuted: false,
  isSpeakerOn: false,
  isCameraOn: true,
  remoteUid: null,
};

export const useCallStore = create<CallStore>((set) => ({
  session: null,
  media: initialMedia,
  isJoined: false,
  setSession: (session) => set({ session }),
  patchSession: (patch) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...patch } : null,
    })),
  setMedia: (patch) =>
    set((state) => ({
      media: { ...state.media, ...patch },
    })),
  setJoined: (isJoined) => set({ isJoined }),
  reset: () => set({ session: null, media: initialMedia, isJoined: false }),
}));
