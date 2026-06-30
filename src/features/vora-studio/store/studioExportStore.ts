import { create } from 'zustand';
import type { PublishedEditManifest } from '@/features/vora-studio/types';

type StudioExportState = {
  editManifest: PublishedEditManifest | null;
  setEditManifest: (manifest: PublishedEditManifest | null) => void;
  clearExport: () => void;
};

export const useStudioExportStore = create<StudioExportState>((set) => ({
  editManifest: null,
  setEditManifest: (editManifest) => set({ editManifest }),
  clearExport: () => set({ editManifest: null }),
}));
