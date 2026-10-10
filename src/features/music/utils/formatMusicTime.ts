import { PHOTO_POST_MUSIC_DURATION_SEC } from '@/features/music/constants';

export function formatMusicDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** İçerikte görünen müzik süresi: seçilen aralık, yoksa parçanın tamamı. */
export function musicClipDurationSec(
  startSec: number | null | undefined,
  endSec: number | null | undefined,
  trackDurationSec: number | null | undefined,
): number {
  const start = Number(startSec ?? 0);
  const end = Number(endSec ?? trackDurationSec ?? 0);
  const clip = end - start;
  if (clip > 0.4) return clip;
  return Math.max(0, Number(trackDurationSec ?? 0));
}

export function formatMusicMeta(artist: string | null | undefined, durationSec?: number | null): string {
  const clock = durationSec && durationSec > 0 ? formatMusicDuration(durationSec) : '';
  return [artist?.trim(), clock].filter(Boolean).join(' · ');
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
