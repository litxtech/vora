import type { PublishedEditManifest, StudioEditorState } from '@/features/vora-studio/types';

export function buildPublishedEditManifest(state: StudioEditorState): PublishedEditManifest | null {
  if (state.textOverlays.length === 0) {
    return null;
  }

  return {
    version: 1,
    textOverlays: state.textOverlays,
    trimStartSec: state.trimStartSec,
    trimEndSec: state.trimEndSec,
  };
}
