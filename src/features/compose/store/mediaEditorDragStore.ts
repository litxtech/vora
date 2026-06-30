import { create } from 'zustand';

export type TrashBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type MediaEditorDragState = {
  isDragging: boolean;
  isOverTrash: boolean;
  trashBounds: TrashBounds | null;
  setDragging: (dragging: boolean) => void;
  setOverTrash: (over: boolean) => void;
  setTrashBounds: (bounds: TrashBounds | null) => void;
  reset: () => void;
};

export function isPointInTrash(x: number, y: number, bounds: TrashBounds | null): boolean {
  if (!bounds) return false;
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export const useMediaEditorDragStore = create<MediaEditorDragState>((set) => ({
  isDragging: false,
  isOverTrash: false,
  trashBounds: null,
  setDragging: (isDragging) => set({ isDragging, isOverTrash: false }),
  setOverTrash: (isOverTrash) => set({ isOverTrash }),
  setTrashBounds: (trashBounds) => set({ trashBounds }),
  reset: () => set({ isDragging: false, isOverTrash: false, trashBounds: null }),
}));

export type OverlayDragDeleteHandlers = {
  onDragStart: () => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
  shouldDeleteOnDrop: (absoluteX: number, absoluteY: number) => boolean;
};

export function createOverlayDragDeleteHandlers(): OverlayDragDeleteHandlers {
  return {
    onDragStart: () => {
      useMediaEditorDragStore.getState().setDragging(true);
    },
    onDragMove: (absoluteX, absoluteY) => {
      const { trashBounds } = useMediaEditorDragStore.getState();
      useMediaEditorDragStore.getState().setOverTrash(isPointInTrash(absoluteX, absoluteY, trashBounds));
    },
    onDragEnd: () => {
      useMediaEditorDragStore.getState().reset();
    },
    shouldDeleteOnDrop: (absoluteX, absoluteY) => {
      const { trashBounds } = useMediaEditorDragStore.getState();
      return isPointInTrash(absoluteX, absoluteY, trashBounds);
    },
  };
}
