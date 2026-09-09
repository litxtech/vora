import { Video, cancelCompression, getVideoMetaData } from 'react-native-compressor';
import { throwIfAborted } from '@/services/video/uploadCancelled';

export type VideoCompressionProfile = 'fast' | 'quality' | 'messaging' | 'post' | 'story';

export type VideoCompressionOptions = {
  profile?: VideoCompressionProfile;
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

type ProfilePreset = {
  maxSize: number;
  /** Bayt: bu boyutun altında sıkıştırma atlanır. */
  skipBelowBytes: number;
  /**
   * react-native-compressor native eşiği — birimi MB (bayt değil).
   * Dosya bu MB değerinden büyükse sıkıştırılır.
   */
  minimumFileSizeForCompressMb: number;
  bitrate?: number;
  compressionMethod: 'auto' | 'manual';
};

const PROFILES: Record<VideoCompressionProfile, ProfilePreset> = {
  /**
   * Gönderi: feed kaydı hemen açılır; video arka planda hızlı 720p olarak küçültülür.
   */
  post: {
    maxSize: 720,
    skipBelowBytes: 0,
    minimumFileSizeForCompressMb: 0,
    bitrate: 1_800_000,
    compressionMethod: 'manual',
  },
  /** Reels / studio: hızlı paylaşım için 720p sıkıştırma. */
  fast: {
    maxSize: 720,
    skipBelowBytes: 0,
    minimumFileSizeForCompressMb: 0,
    bitrate: 1_600_000,
    compressionMethod: 'manual',
  },
  /** Hikâye: kısa kliplerde hızlı 720p sıkıştırma. */
  story: {
    maxSize: 720,
    skipBelowBytes: 0,
    minimumFileSizeForCompressMb: 0,
    bitrate: 1_400_000,
    compressionMethod: 'manual',
  },
  /** Yüksek kalite isteyen eski çağrılar: 1080p ama yine hızlı manual profil. */
  quality: {
    maxSize: 1080,
    skipBelowBytes: 0,
    minimumFileSizeForCompressMb: 0,
    bitrate: 2_500_000,
    compressionMethod: 'manual',
  },
  /**
   * Sohbet / destek: boyut limiti var — yalnızca büyük dosyalarda hızlı 720p sıkıştırma.
   * manual + sabit bitrate donanım kodlayıcıda auto'dan daha öngörülebilir süre verir.
   */
  messaging: {
    maxSize: 720,
    skipBelowBytes: 14 * 1024 * 1024,
    minimumFileSizeForCompressMb: 14,
    bitrate: 1_400_000,
    compressionMethod: 'manual',
  },
};

/** Dosya boyutu eşiğin altındaysa sıkıştırma atlanır. */
export function shouldSkipVideoCompression(
  fileSizeBytes: number,
  profile: VideoCompressionProfile = 'post',
): boolean {
  if (fileSizeBytes <= 0) return false;
  return fileSizeBytes <= PROFILES[profile].skipBelowBytes;
}

/**
 * Videoyu yükleme için sıkıştırır.
 * `post` profili feed kaydından sonra arka planda çalışacak şekilde hızlı tutulur.
 */
export async function compressVideoForUpload(
  uri: string,
  options: VideoCompressionOptions = {},
): Promise<string> {
  throwIfAborted(options.signal);

  const profile = options.profile ?? 'post';
  const preset = PROFILES[profile];
  let cancelId: string | undefined;

  const onAbort = () => {
    if (cancelId) cancelCompression(cancelId);
  };

  if (options.signal) {
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const maxSize = Math.max(options.maxWidth ?? preset.maxSize, options.maxHeight ?? preset.maxSize);
    const bitrate = options.bitrate ?? preset.bitrate;

    const compressOptions: Parameters<typeof Video.compress>[1] = {
      compressionMethod: preset.compressionMethod,
      maxSize,
      minimumFileSizeForCompress: preset.minimumFileSizeForCompressMb,
      progressDivider: 10,
      getCancellationId: (id) => {
        cancelId = id;
      },
    };

    if (preset.compressionMethod === 'manual' && bitrate != null) {
      compressOptions.bitrate = bitrate;
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
