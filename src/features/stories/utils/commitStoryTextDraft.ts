import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { createStoryTextOverlay } from '@/features/stories/utils/storyTextOverlays';

/** Bitti / paylaş öncesi taslak metni overlay listesine yazar. */
export function commitStoryTextDraft(
  overlays: StudioTextOverlay[],
  pending: { id: string; text: string } | null | undefined,
  fallbackOverlay?: StudioTextOverlay | null,
): StudioTextOverlay[] {
  if (!pending?.text.trim()) {
    return overlays.filter((item) => item.text.trim());
  }

  const exists = overlays.some((item) => item.id === pending.id);
  const merged = exists
    ? overlays.map((item) =>
        item.id === pending.id ? { ...item, text: pending.text } : item,
      )
    : fallbackOverlay && fallbackOverlay.id === pending.id
      ? [...overlays, { ...fallbackOverlay, text: pending.text }]
      : [...overlays, createStoryTextOverlay({ id: pending.id, text: pending.text })];

  return merged.filter((item) => item.text.trim());
}

export function mergeStoryTextDraftIntoOverlays(
  overlays: StudioTextOverlay[],
  draft: { id: string; text: string } | null | undefined,
): StudioTextOverlay[] {
  if (!draft) return overlays;
  const exists = overlays.some((item) => item.id === draft.id);
  if (!exists) {
    return [...overlays, createStoryTextOverlay({ id: draft.id, text: draft.text })];
  }
  return overlays.map((item) =>
    item.id === draft.id ? { ...item, text: draft.text } : item,
  );
}
