import { PHOTO_POST_MUSIC_DURATION_SEC } from '@/features/music/constants';

export function formatMusicDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function clampMusicRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeMusicEnd(startSec: number, clipDurationSec: number, trackDurationSec: number): number {
  return Math.min(startSec + clipDurationSec, trackDurationSec);
}

export function photoPostMusicEndSec(startSec: number, trackDurationSec: number): number {
  return computeMusicEnd(startSec, PHOTO_POST_MUSIC_DURATION_SEC, trackDurationSec);
}
