import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { VideoCodec, VideoQuality, VideoStabilization } from 'expo-camera';

export const CAPTURE_PHOTO_QUALITY = 0.92;

/** Gönderi / Reels / Hikaye video kaydı — net 1080p. */
export const CAPTURE_VIDEO_QUALITY: VideoQuality = '1080p';
/** ~10 Mbps — bloklu / bulanık kayıtları azaltır. */
export const CAPTURE_VIDEO_BITRATE = 10_000_000;
export const CAPTURE_VIDEO_STABILIZATION: VideoStabilization = 'auto';
/** iOS bitrate için codec gerekli; hvc1 yoksa avc1. */
export const CAPTURE_VIDEO_CODEC: VideoCodec = 'avc1';

export type FinalizedPhoto = {
  uri: string;
  width: number;
  height: number;
};

/**
 * Sensör görüntüsünü doğru yönde piksele işler.
 * manipulateAsync sonrası width/height editörde gerçek oranı korur (yamulma önlenir).
 */
export async function finalizeCapturedPhoto(
  uri: string,
  captured?: { width?: number; height?: number },
): Promise<FinalizedPhoto> {
  const result = await manipulateAsync(uri, [], {
    compress: CAPTURE_PHOTO_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width > 0 ? result.width : captured?.width ?? 0,
    height: result.height > 0 ? result.height : captured?.height ?? 0,
  };
}

export function capturePictureOptions(): {
  quality: number;
  skipProcessing?: boolean;
} {
  return {
    quality: CAPTURE_PHOTO_QUALITY,
    // Android: önizleme kırpmasını atla; oryantasyonu finalizeCapturedPhoto düzeltir.
    ...(Platform.OS === 'android' ? { skipProcessing: true } : {}),
  };
}

/** CameraView video kalite prop'ları. */
export function captureVideoViewProps(cameraMode: 'picture' | 'video') {
  return {
    videoQuality: CAPTURE_VIDEO_QUALITY,
    videoBitrate: CAPTURE_VIDEO_BITRATE,
    videoStabilizationMode: CAPTURE_VIDEO_STABILIZATION,
    // Video: 16:9 — 4:3 tam ekranda yamulur / düşük çözünürlüğe düşer.
    // Foto: 4:3 sensör oranı daha temiz.
    ...(Platform.OS === 'android'
      ? { ratio: (cameraMode === 'video' ? '16:9' : '4:3') as '16:9' | '4:3' }
      : {}),
  };
}

/** recordAsync seçenekleri — iOS'ta codec + bitrate birlikte. */
export function captureRecordOptions(maxDuration: number) {
  return {
    maxDuration,
    ...(Platform.OS === 'ios' ? { codec: CAPTURE_VIDEO_CODEC } : {}),
  };
}
