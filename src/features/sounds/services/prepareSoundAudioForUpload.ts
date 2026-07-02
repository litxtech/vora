import { Audio, Video } from 'react-native-compressor';
import { createAudioPlayer } from 'expo-audio';
import { MAX_SOUND_UPLOAD_BYTES } from '@/features/sounds/constants';
import { getLocalFileSize, normalizeLocalFileUri, readLocalFileBytes } from '@/lib/files/readLocalFile';

export type PrepareSoundMode = 'normal' | 'aggressive';

export type PrepareSoundOptions = {
  mode?: PrepareSoundMode;
  onProgress?: (stage: 'preparing' | 'compressing', label: string) => void;
};

type PrepareResult =
  | { ok: true; uri: string; compressed: boolean }
  | { ok: false; error: string };

type CompressOptions = {
  quality?: 'medium' | 'low';
  bitrate?: number;
  samplerate?: number;
  channels?: number;
};

const DIRECT_UPLOAD_BYTES = 20 * 1024 * 1024;
const LEGACY_BUCKET_BYTES = 5 * 1024 * 1024;

function targetBytesForMode(mode: PrepareSoundMode): number {
  if (mode === 'aggressive') {
    return Math.floor(LEGACY_BUCKET_BYTES * 0.85);
  }
  return Math.floor(MAX_SOUND_UPLOAD_BYTES * 0.9);
}

function fileExtension(uri: string): string {
  const clean = uri.split('?')[0] ?? uri;
  return clean.split('.').pop()?.toLowerCase() ?? '';
}

function isVideoContainer(uri: string): boolean {
  return ['mp4', 'mov', 'm4v', '3gp', 'webm', 'mkv'].includes(fileExtension(uri));
}

function isCompressedAudio(uri: string): boolean {
  return ['mp3', 'm4a', 'aac', 'ogg'].includes(fileExtension(uri));
}

async function fileReadable(uri: string): Promise<boolean> {
  try {
    const normalized = normalizeLocalFileUri(uri);
    const size = getLocalFileSize(normalized);
    if (size > 0) return true;
    await readLocalFileBytes(normalized);
    return true;
  } catch {
    return false;
  }
}

async function probeDurationSec(uri: string): Promise<number> {
  const player = createAudioPlayer({ uri: normalizeLocalFileUri(uri) });
  try {
    if (player.duration > 0) return player.duration;

    return await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('timeout'));
      }, 8000);

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.duration > 0) {
          clearTimeout(timeout);
          subscription.remove();
          resolve(status.duration);
        }
      });
    });
  } finally {
    player.release();
  }
}

async function tryCompress(uri: string, options: CompressOptions): Promise<string | null> {
  try {
    return await Audio.compress(normalizeLocalFileUri(uri), options);
  } catch {
    return null;
  }
}

function bitrateForDuration(durationSec: number, targetBytes: number): number {
  const sec = Math.max(1, durationSec);
  const raw = Math.floor((targetBytes * 8) / sec);
  return Math.max(32000, Math.min(128000, raw));
}

async function normalizeVideoSource(uri: string, onProgress?: PrepareSoundOptions['onProgress']): Promise<string> {
  const normalized = normalizeLocalFileUri(uri);
  onProgress?.('preparing', 'Video hazırlanıyor…');

  const direct = await tryCompress(normalized, {
    quality: 'low',
    bitrate: 64000,
    samplerate: 32000,
    channels: 1,
  });
  if (direct && getLocalFileSize(direct) > 0 && getLocalFileSize(direct) < getLocalFileSize(normalized)) {
    return direct;
  }

  try {
    const tinyVideo = await Video.compress(normalized, {
      compressionMethod: 'auto',
      maxSize: 480,
      bitrate: 96_000,
      minimumFileSizeForCompress: 0,
    });
    const fromVideo = await tryCompress(tinyVideo, {
      quality: 'low',
      bitrate: 48000,
      samplerate: 22050,
      channels: 1,
    });
    if (fromVideo && getLocalFileSize(fromVideo) > 0) {
      return fromVideo;
    }
    return tinyVideo;
  } catch {
    return normalized;
  }
}

export function mapSoundUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('maximum allowed size') || lower.includes('entity too large') || lower.includes('payload too large')) {
    return 'Dosya sunucu limitini aşıyor. Daha kısa bir klip deneyin.';
  }
  if (lower.includes('mime type') || lower.includes('not allowed')) {
    return 'Dosya formatı desteklenmiyor. MP3 veya M4A deneyin.';
  }
  if (lower.includes('dosya okunamadı')) {
    return 'Ses dosyası okunamadı. Yeniden kaydedip tekrar deneyin.';
  }
  return message;
}

export function isSoundUploadSizeError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('maximum allowed size') ||
    lower.includes('entity too large') ||
    lower.includes('payload too large') ||
    lower.includes('sunucu limitini')
  );
}

/** Sıkıştırmayı dener; başarısız olursa okunabilir orijinal dosyayı kullanır. */
export async function prepareSoundAudioForUpload(
  localUri: string,
  options?: PrepareSoundOptions,
): Promise<PrepareResult> {
  const mode = options?.mode ?? 'normal';
  const targetBytes = targetBytesForMode(mode);
  const normalized = normalizeLocalFileUri(localUri);
  const fromVideo = isVideoContainer(normalized);

  let uri = fromVideo ? await normalizeVideoSource(normalized, options?.onProgress) : normalized;
  let size = getLocalFileSize(uri);

  if (!fromVideo && isCompressedAudio(uri) && size > 0 && size <= DIRECT_UPLOAD_BYTES) {
    return { ok: true, uri, compressed: false };
  }

  if (size > 0 && size <= targetBytes && !fromVideo) {
    return { ok: true, uri, compressed: uri !== normalized };
  }

  let durationSec = 60;
  try {
    durationSec = await probeDurationSec(uri);
  } catch {
    durationSec = Math.max(30, Math.ceil((Math.max(size, 1) * 8) / 128000));
  }

  const passes: CompressOptions[] = [
    { quality: 'low', bitrate: bitrateForDuration(durationSec, targetBytes), samplerate: 44100, channels: 1 },
    { quality: 'low', bitrate: 48000, samplerate: 32000, channels: 1 },
    { quality: 'low', bitrate: 32000, samplerate: 22050, channels: 1 },
  ];

  let bestUri = uri;
  let bestSize = size > 0 ? size : Number.POSITIVE_INFINITY;

  for (let i = 0; i < passes.length; i += 1) {
    options?.onProgress?.('compressing', `Ses sıkıştırılıyor… (${i + 1}/${passes.length})`);
    const compressed = await tryCompress(uri, passes[i]!);
    if (!compressed) continue;

    const compressedSize = getLocalFileSize(compressed);
    if (compressedSize <= 0) continue;

    if (compressedSize < bestSize) {
      bestUri = compressed;
      bestSize = compressedSize;
    }

    if (compressedSize <= targetBytes) {
      return { ok: true, uri: compressed, compressed: true };
    }
  }

  if (bestSize <= MAX_SOUND_UPLOAD_BYTES) {
    return { ok: true, uri: bestUri, compressed: bestUri !== normalized };
  }

  if (await fileReadable(normalized)) {
    const originalSize = getLocalFileSize(normalized);
    if (originalSize === 0 || originalSize <= MAX_SOUND_UPLOAD_BYTES) {
      return { ok: true, uri: normalized, compressed: false };
    }
  }

  return {
    ok: false,
    error: `Ses dosyası çok büyük (${(bestSize / (1024 * 1024)).toFixed(1)} MB). Daha kısa bir klip seçin.`,
  };
}

export async function probeSoundDurationSec(uri: string): Promise<number> {
  return probeDurationSec(uri);
}
