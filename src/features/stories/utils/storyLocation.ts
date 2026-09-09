import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import type { StoryLocationManifest } from '@/features/stories/utils/storyManifest';

export type StoryLocationPosition = {
  xNorm: number;
  yNorm: number;
};

/** Rozet yaklaşık yüksekliği — % translate yerine piksel ofset (RN parent sapması önlenir) */
export const STORY_LOCATION_BADGE_HEIGHT = 52;

/** Sol alt — rozetin alt kenarı kartın ~%88’inde */
export const DEFAULT_STORY_LOCATION_POSITION: StoryLocationPosition = {
  xNorm: 0.06,
  yNorm: 0.88,
};

export function clampStoryLocationNorm(value: number): number {
  return Math.max(0.04, Math.min(0.96, value));
}

export function clampStoryLocationXNorm(value: number): number {
  return Math.max(0.04, Math.min(0.72, value));
}

export function clampStoryLocationYNorm(value: number): number {
  return Math.max(0.12, Math.min(0.94, value));
}

export function storyLocationSubtitle(
  location: Pick<SelectedLocation, 'subtitle' | 'latitude'>,
): string | null {
  if (location.subtitle?.trim()) return location.subtitle.trim();
  if (location.latitude != null) return 'Haritada';
  return null;
}

export function shouldStackStoryMusicAboveLocation(
  location: StoryLocationManifest | null | undefined,
): boolean {
  return Boolean(location?.label) && resolveStoryLocationPosition(location).yNorm >= 0.72;
}

export function resolveStoryLocationPosition(
  manifest: StoryLocationManifest | null | undefined,
): StoryLocationPosition {
  if (manifest?.xNorm != null && manifest?.yNorm != null) {
    return {
      xNorm: clampStoryLocationXNorm(manifest.xNorm),
      yNorm: clampStoryLocationYNorm(manifest.yNorm),
    };
  }
  return DEFAULT_STORY_LOCATION_POSITION;
}

export function selectedLocationToManifest(
  location: SelectedLocation | null | undefined,
  position: StoryLocationPosition = DEFAULT_STORY_LOCATION_POSITION,
): StoryLocationManifest | null {
  const label = location?.label?.trim();
  if (!label) return null;

  return {
    label,
    subtitle: location.subtitle?.trim() || undefined,
    xNorm: clampStoryLocationXNorm(position.xNorm),
    yNorm: clampStoryLocationYNorm(position.yNorm),
  };
}
