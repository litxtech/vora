import { Video, cancelCompression, getVideoMetaData } from 'react-native-compressor';
import { throwIfAborted } from '@/services/video/uploadCancelled';

export type VideoCompressionProfile = 'fast' | 'quality' | 'messaging' | 'post';

export type VideoCompressionOptions = {
  profile?: VideoCompressionProfile;
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

const PROFILES: Record<
  VideoCompressionProfile,
  { maxSize: number; minimumFileSizeForCompress: number; bitrate?: number }
> = {
  /**
   * Gönderi paylaşımı: 1080p hedef, yalnızca çok büyük dosyalarda donanım sıkıştırma.
   * Anında paylaşım akışında çoğu video Mux'a doğrudan gider; Mux 1080p transcode yapar.
   */
  post: {
    maxSize: 1080,
    minimumFileSizeForCompress: 80 * 1024 * 1024,
    bitrate: 2_500_000,
  },
  /** Hızlı paylaşım / studio: 720p, orta dosyalarda sıkıştırma atlanır */
  fast: {
    maxSize: 720,
    minimumFileSizeForCompress: 32 * 1024 * 1024,
  },
  /** Sohbet: kısa videolarda sıkıştırma atlanır */
  messaging: {
    maxSize: 720,
    minimumFileSizeForCompress: 10 * 1024 * 1024,
  },
  /** Reels / yüksek kalite */
  quality: {
    maxSize: 1080,
    minimumFileSizeForCompress: 0,
  },
};

/** Dosya boyutu eşiğin altındaysa sıkıştırma atlanır (react-native-compressor minimumFileSizeForCompress). */
export function shouldSkipVideoCompression(
  fileSizeBytes: number,
  profile: VideoCompressionProfile = 'fast',
): boolean {
  if (fileSizeBytes <= 0) return false;
  return fileSizeBytes <= PROFILES[profile].minimumFileSizeForCompress;
}

/**
 * Videoyu yükleme için sıkıştırır.
 * `fast` profili büyük/uzun videolarda paylaşım süresini kısaltır.
 */
export async function compressVideoForUpload(
  uri: string,
  options: VideoCompressionOptions = {},
): Promise<string> {
  throwIfAborted(options.signal);

  const profile = options.profile ?? 'quality';
  const preset = PROFILES[profile];
  let cancelId: string | undefined;

  const onAbort = () => {
    if (cancelId) cancelCompression(cancelId);
  };

  if (options.signal) {
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const compressOptions: Parameters<typeof Video.compress>[1] = {
      compressionMethod: 'auto',
      maxSize: Math.max(options.maxWidth ?? preset.maxSize, options.maxHeight ?? preset.maxSize),
      minimumFileSizeForCompress: preset.minimumFileSizeForCompress,
      getCancellationId: (id) => {
        cancelId = id;
      },
    };
    if (preset.bitrate != null) {
      compressOptions.bitrate = preset.bitrate;
    }

    return await Video.compress(
      uri,
      compressOptions,
      (progress) => {
        options.onProgress?.(progress);
      },
    );
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export async function getCompressedVideoMeta(uri: string) {
  return getVideoMetaData(uri);
}
