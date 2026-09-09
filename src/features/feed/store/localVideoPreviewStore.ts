import { create } from 'zustand';

export type LocalVideoPreviewEntry = {
  uri: string;
  posterUri: string | null;
};

type LocalVideoPreviewState = {
  /** videoId → yerel önizleme (yalnızca paylaşan cihazda, Mux hazır olana kadar) */
  byVideoId: Record<string, LocalVideoPreviewEntry>;
  setPreview: (videoId: string, uri: string, posterUri?: string | null) => void;
  setPoster: (videoId: string, posterUri: string) => void;
  getPreview: (videoId: string) => LocalVideoPreviewEntry | null;
  clearPreview: (videoId: string) => void;
};

/**
 * Paylaşan kullanıcının feed'de Mux hazır olmadan yerel videoyu görmesi için.
 * DB'ye yazılmaz — yalnızca bellek.
 */
export const useLocalVideoPreviewStore = create<LocalVideoPreviewState>((set, get) => ({
  byVideoId: {},
  setPreview: (videoId, uri, posterUri = null) => {
    if (!videoId || !uri) return;
    set((s) => ({
      byVideoId: {
        ...s.byVideoId,
        [videoId]: { uri, posterUri: posterUri ?? s.byVideoId[videoId]?.posterUri ?? null },
      },
    }));
  },
  setPoster: (videoId, posterUri) => {
    if (!videoId || !posterUri) return;
    set((s) => {
      const prev = s.byVideoId[videoId];
      if (!prev?.uri) return s;
      if (prev.posterUri === posterUri) return s;
      return {
        byVideoId: {
          ...s.byVideoId,
          [videoId]: { ...prev, posterUri },
        },
      };
    });
  },
  getPreview: (videoId) => get().byVideoId[videoId] ?? null,
  clearPreview: (videoId) => {
    set((s) => {
      if (!(videoId in s.byVideoId)) return s;
      const next = { ...s.byVideoId };
      delete next[videoId];
      return { byVideoId: next };
    });
  },
}));
