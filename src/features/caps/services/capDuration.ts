import { getVideoMetaData } from 'react-native-compressor';
import { CAP_VIDEO_MAX_DURATION_MS } from '@/features/caps/constants';

/**
 * react-native-compressor bazı cihazlarda süre saniye, bazılarında ms döner.
 * Caps kısa klipler için bunu tek birime (ms) çevirir.
 */
export function normalizeVideoDurationMs(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  // >= 100 ≈ milisaniye (ör. 3000). < 100 ≈ saniye (ör. 3 / 3.2).
  if (raw >= 100) return Math.round(raw);
  return Math.round(raw * 1000);
}

export async function probeVideoDurationMs(uri: string): Promise<number> {
  try {
    const meta = await getVideoMetaData(uri);
    return normalizeVideoDurationMs(Number(meta?.duration ?? 0));
  } catch {
    return 0;
  }
}

/** Editör + probe sonuçlarından güvenilir caps süresi seçer. */
export function resolveCapDurationMs(
  editorDurationMs?: number | null,
  probedDurationMs?: number | null,
): number {
  const editor = editorDurationMs && editorDurationMs > 0 ? Math.round(editorDurationMs) : 0;
  const probed = probedDurationMs && probedDurationMs > 0 ? Math.round(probedDurationMs) : 0;

  // Editör süresi varsa öncelik; probe aşırı şişmişse (yanlış birim) yok say.
  if (editor > 0 && editor <= CAP_VIDEO_MAX_DURATION_MS) return editor;
  if (probed > 0 && probed <= CAP_VIDEO_MAX_DURATION_MS) return probed;
  if (editor > 0) return editor;
  return probed;
}

export function isCapDurationAllowed(durationMs: number): boolean {
  return durationMs > 0 && durationMs <= CAP_VIDEO_MAX_DURATION_MS;
}
