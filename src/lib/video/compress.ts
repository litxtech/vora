import { Video, getVideoMetaData } from 'react-native-compressor';

export type VideoCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
};

const DEFAULT_OPTIONS: Required<VideoCompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  bitrate: 2_500_000,
};

/**
 * Tüm videoları 1080p'ye sıkıştırır.
 * Kaynak 4K veya 20+ dakika olsa bile hızlı paylaşım için optimize edilir.
 */
export async function compressVideoForUpload(
  uri: string,
  options: VideoCompressionOptions = {},
): Promise<string> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return Video.compress(
    uri,
    {
      compressionMethod: 'auto',
      maxSize: Math.max(config.maxWidth, config.maxHeight),
      minimumFileSizeForCompress: 0,
    },
    (progress) => {
      if (__DEV__) {
        console.log(`[video-compress] %${Math.round(progress * 100)}`);
      }
    },
  );
}

export async function getCompressedVideoMeta(uri: string) {
  return getVideoMetaData(uri);
}
