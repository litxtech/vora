import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const CAPTURE_PHOTO_QUALITY = 0.92;

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
