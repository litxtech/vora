import type { StudioClip } from '@/features/vora-studio/types';
import { generateId } from '@/features/vora-studio/utils/time';

export function createInitialClips(durationSec: number): StudioClip[] {
  return [
    {
      id: generateId('clip'),
      startSec: 0,
      endSec: durationSec,
      order: 0,
    },
  ];
}

export function splitClipAt(clips: StudioClip[], timeSec: number): StudioClip[] {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  const next: StudioClip[] = [];

  for (const clip of sorted) {
    if (timeSec <= clip.startSec || timeSec >= clip.endSec) {
      next.push(clip);
      continue;
    }

    next.push({
      id: clip.id,
      startSec: clip.startSec,
      endSec: timeSec,
      order: clip.order,
    });
    next.push({
      id: generateId('clip'),
      startSec: timeSec,
      endSec: clip.endSec,
      order: clip.order + 0.5,
    });
  }

  return next
    .sort((a, b) => a.order - b.order)
    .map((clip, index) => ({ ...clip, order: index }));
}

export function deleteClip(clips: StudioClip[], clipId: string): StudioClip[] {
  const filtered = clips.filter((c) => c.id !== clipId);
  if (filtered.length === 0) return clips;
  return filtered.map((clip, index) => ({ ...clip, order: index }));
}

export function moveClip(clips: StudioClip[], clipId: string, direction: 'up' | 'down'): StudioClip[] {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((c) => c.id === clipId);
  if (index < 0) return clips;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= sorted.length) return clips;

  const copy = [...sorted];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy.map((clip, i) => ({ ...clip, order: i }));
}

export function mergeAdjacentClips(clips: StudioClip[]): StudioClip[] {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  if (sorted.length < 2) return sorted;

  const merged: StudioClip[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const current = sorted[i];
    if (Math.abs(prev.endSec - current.startSec) < 0.05) {
      merged[merged.length - 1] = {
        ...prev,
        endSec: current.endSec,
      };
    } else {
      merged.push(current);
    }
  }

  return merged.map((clip, index) => ({ ...clip, order: index }));
}

export function clipsDurationSec(clips: StudioClip[]): number {
  return clips.reduce((sum, clip) => sum + (clip.endSec - clip.startSec), 0);
}

export function effectiveTrimFromClips(clips: StudioClip[]): { start: number; end: number } {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return { start: 0, end: 0 };
  return { start: sorted[0].startSec, end: sorted[sorted.length - 1].endSec };
}
