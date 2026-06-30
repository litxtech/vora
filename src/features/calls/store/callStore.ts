import { create } from 'zustand';
import { CALL_FLOAT_DEFAULT_POSITION } from '@/features/calls/constants';
import type { CallMediaState, CallSession } from '../types';

export type CallBubblePosition = {
  x: number;
  y: number;
};

type CallStore = {
  session: CallSession | null;
  media: CallMediaState;
  isJoined: boolean;
  bubblePosition: CallBubblePosition;
  setSession: (session: CallSession | null) => void;
  patchSession: (patch: Partial<CallSession>) => void;
  setMedia: (patch: Partial<CallMediaState>) => void;
  setJoined: (joined: boolean) => void;
  setBubblePosition: (position: CallBubblePosition) => void;
  reset: () => void;
};

const initialMedia: CallMediaState = {
  isMuted: false,
  isSpeakerOn: false,
  isCameraOn: true,
  isFrontCamera: true,
  remoteUid: null,
  remoteCameraOff: false,
};

export const useCallStore = create<CallStore>((set) => ({
  session: null,
  media: initialMedia,
  isJoined: false,
  bubblePosition: CALL_FLOAT_DEFAULT_POSITION,
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
  setBubblePosition: (bubblePosition) => set({ bubblePosition }),
  reset: () =>
    set({
      session: null,
      media: initialMedia,
      isJoined: false,
      bubblePosition: CALL_FLOAT_DEFAULT_POSITION,
    }),
}));
