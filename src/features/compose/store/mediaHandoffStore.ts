import { create } from 'zustand';

export type MediaHandoffPayload = {
  mediaUris: string[];
  mediaType?: 'image' | 'video';
  mediaWidths?: number[];
  mediaHeights?: number[];
  publishAs?: 'reel' | 'post';
};

type MediaHandoffState = {
  payload: MediaHandoffPayload | null;
  setHandoff: (payload: MediaHandoffPayload) => void;
  /** Okuyup temizler — route paramlarında file:// bozulmasını önler. */
  takeHandoff: () => MediaHandoffPayload | null;
  clearHandoff: () => void;
};

/**
 * Kamera / galeri file:// URI'lerini media-editor ve compose arasında taşır.
 * expo-router params file:// yollarını encode ederken bozabiliyor → siyah ekran.
 */
export const useMediaHandoffStore = create<MediaHandoffState>((set, get) => ({
  payload: null,
  setHandoff: (payload) => set({ payload }),
  takeHandoff: () => {
    const current = get().payload;
    set({ payload: null });
    return current;
  },
  clearHandoff: () => set({ payload: null }),
}));
