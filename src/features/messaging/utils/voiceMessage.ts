export function formatVoiceDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseVoiceDurationSec(content: string | null | undefined): number | null {
  if (!content?.trim()) return null;
  try {
    const parsed = JSON.parse(content) as { durationSec?: number; duration?: number };
    const raw = parsed.durationSec ?? parsed.duration;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  } catch {
    /* plain text legacy */
  }
  return null;
}

export function buildVoiceMessageContent(durationSec: number): string {
  return JSON.stringify({ durationSec: Math.max(0, Math.floor(durationSec)) });
}

/** Dekoratif dalga çubuk yükseklikleri — mesaj kimliğine göre sabit. */
export function voiceWaveformHeights(seed: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return Array.from({ length: count }, (_, index) => {
    hash = (hash * 1664525 + 1013904223 + index) >>> 0;
    return 0.25 + (hash % 100) / 100;
  });
}
