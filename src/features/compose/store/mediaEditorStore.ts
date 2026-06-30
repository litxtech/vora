import { create } from 'zustand';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import type { MediaEditorFilterId } from '@/features/compose/constants/mediaEditor';
import type { MediaEditorZoomState } from '@/features/compose/utils/mediaEditorZoom';
import { DEFAULT_ZOOM } from '@/features/compose/utils/mediaEditorZoom';
import type { StudioTextOverlay } from '@/features/vora-studio/types';

export type MediaEditorSlide = {
  uri: string;
  isVideo: boolean;
  durationSec: number;
  textOverlays: StudioTextOverlay[];
  filterId: MediaEditorFilterId;
  rotationDeg: 0 | 90 | 180 | 270;
  mediaWidth: number;
  mediaHeight: number;
  zoomScale: number;
  zoomTranslateX: number;
  zoomTranslateY: number;
};

export type MediaEditorPanel = 'none' | 'text' | 'location' | 'music' | 'filter';

type MediaEditorState = {
  slides: MediaEditorSlide[];
  currentIndex: number;
  selectedLocation: SelectedLocation | null;
  /** Normalize edilmiş konum baloncuğu (0–1) */
  locationPinX: number | null;
  locationPinY: number | null;
  activePanel: MediaEditorPanel;
  selectedTextOverlayId: string | null;
  trimStartSec: number;
  trimEndSec: number;
  videoMuted: boolean;
  initSlides: (slides: MediaEditorSlide[]) => void;
  reset: () => void;
  setCurrentIndex: (index: number) => void;
  setActivePanel: (panel: MediaEditorPanel) => void;
  setSelectedLocation: (location: SelectedLocation | null) => void;
  setLocationPin: (x: number, y: number) => void;
  setSelectedTextOverlayId: (id: string | null) => void;
  setTrimRange: (startSec: number, endSec: number) => void;
  setVideoMuted: (muted: boolean) => void;
  rotateSlide: (index: number) => void;
  setSlideFilter: (index: number, filterId: MediaEditorFilterId) => void;
  setSlideZoom: (index: number, zoom: MediaEditorZoomState) => void;
  updateSlide: (index: number, patch: Partial<MediaEditorSlide>) => void;
  addTextOverlay: (index: number, overlay: Omit<StudioTextOverlay, 'id'>) => void;
  updateTextOverlay: (index: number, id: string, patch: Partial<StudioTextOverlay>) => void;
  removeTextOverlay: (index: number, id: string) => void;
};

const INITIAL: Pick<
  MediaEditorState,
  | 'slides'
  | 'currentIndex'
  | 'selectedLocation'
  | 'locationPinX'
  | 'locationPinY'
  | 'activePanel'
  | 'selectedTextOverlayId'
  | 'trimStartSec'
  | 'trimEndSec'
  | 'videoMuted'
> = {
  slides: [],
  currentIndex: 0,
  selectedLocation: null,
  locationPinX: null,
  locationPinY: null,
  activePanel: 'none',
  selectedTextOverlayId: null,
  trimStartSec: 0,
  trimEndSec: 0,
  videoMuted: false,
};

function overlayId(): string {
  return `txt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useMediaEditorStore = create<MediaEditorState>((set, get) => ({
  ...INITIAL,

  initSlides: (slides) =>
    set({
      ...INITIAL,
      slides,
      trimEndSec: slides[0]?.durationSec ?? 0,
    }),

  reset: () => set(INITIAL),

  setCurrentIndex: (currentIndex) => set({ currentIndex, activePanel: 'none' }),

  setActivePanel: (activePanel) => {
    const clearSelection =
      activePanel === 'location' || activePanel === 'filter' || activePanel === 'music';
    set({
      activePanel,
      selectedTextOverlayId: clearSelection ? null : get().selectedTextOverlayId,
    });
  },

  setSelectedLocation: (selectedLocation) =>
    set((state) => ({
      selectedLocation,
      locationPinX: selectedLocation ? (state.locationPinX ?? 0.5) : null,
      locationPinY: selectedLocation ? (state.locationPinY ?? 0.82) : null,
    })),

  setLocationPin: (locationPinX, locationPinY) => set({ locationPinX, locationPinY }),

  setSelectedTextOverlayId: (selectedTextOverlayId) => set({ selectedTextOverlayId }),

  setTrimRange: (trimStartSec, trimEndSec) => set({ trimStartSec, trimEndSec }),

  setVideoMuted: (videoMuted) => set({ videoMuted }),

  rotateSlide: (index) =>
    set((state) => ({
      slides: state.slides.map((slide, i) => {
        if (i !== index || slide.isVideo) return slide;
        const next = ((slide.rotationDeg + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...slide, rotationDeg: next };
      }),
    })),

  setSlideFilter: (index, filterId) =>
    set((state) => ({
      slides: state.slides.map((slide, i) => (i === index ? { ...slide, filterId } : slide)),
    })),

  setSlideZoom: (index, zoom) =>
    set((state) => ({
      slides: state.slides.map((slide, i) =>
        i === index
          ? {
              ...slide,
              zoomScale: zoom.zoomScale,
              zoomTranslateX: zoom.zoomTranslateX,
              zoomTranslateY: zoom.zoomTranslateY,
            }
          : slide,
      ),
    })),

  updateSlide: (index, patch) =>
    set((state) => ({
      slides: state.slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    })),

  addTextOverlay: (index, overlay) => {
    const id = overlayId();
    set((state) => ({
      slides: state.slides.map((slide, i) =>
        i === index
          ? { ...slide, textOverlays: [...slide.textOverlays, { ...overlay, id }] }
          : slide,
      ),
      selectedTextOverlayId: id,
    }));
  },

  updateTextOverlay: (index, id, patch) =>
    set((state) => ({
      slides: state.slides.map((slide, i) =>
        i === index
          ? {
              ...slide,
              textOverlays: slide.textOverlays.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            }
          : slide,
      ),
    })),

  removeTextOverlay: (index, id) =>
    set((state) => ({
      slides: state.slides.map((slide, i) =>
        i === index
          ? { ...slide, textOverlays: slide.textOverlays.filter((item) => item.id !== id) }
          : slide,
      ),
      selectedTextOverlayId: state.selectedTextOverlayId === id ? null : state.selectedTextOverlayId,
    })),
}));
