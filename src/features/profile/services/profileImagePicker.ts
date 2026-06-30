import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getImageSize } from '@/features/compose/services/mediaEditorImage';

export type CropAspect = [number, number];

export const LOGO_CROP_ASPECT: CropAspect = [1, 1];
export const COVER_CROP_ASPECT: CropAspect = [16, 9];

async function ensureGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('İzin gerekli', 'Görsel seçmek için galeri erişimine izin vermeniz gerekiyor.');
    return false;
  }
  return true;
}

async function centerCropToAspect(uri: string, aspect: CropAspect): Promise<string> {
  const [aspectW, aspectH] = aspect;
  const { width, height } = await getImageSize(uri);
  const targetRatio = aspectW / aspectH;
  const currentRatio = width / height;

  let cropW = width;
  let cropH = height;
  if (currentRatio > targetRatio) {
    cropW = Math.round(height * targetRatio);
  } else {
    cropH = Math.round(width / targetRatio);
  }

  const originX = Math.max(0, Math.floor((width - cropW) / 2));
  const originY = Math.max(0, Math.floor((height - cropH) / 2));

  const result = await manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: cropW, height: cropH } }],
    { compress: 0.88, format: SaveFormat.JPEG },
  );
  return result.uri;
}

async function ensureAspectCrop(uri: string, aspect: CropAspect): Promise<string> {
  const [aspectW, aspectH] = aspect;
  const { width, height } = await getImageSize(uri);
  const targetRatio = aspectW / aspectH;
  const currentRatio = width / height;
  const tolerance = 0.08;
  if (Math.abs(currentRatio - targetRatio) / targetRatio <= tolerance) {
    return uri;
  }
  return centerCropToAspect(uri, aspect);
}

/** Galeriden görsel seçer; iOS'ta yerel kırpma, Android'de gerekirse merkez kırpma uygular. */
export async function pickCroppedProfileImage(aspect: CropAspect): Promise<string | null> {
  if (!(await ensureGalleryPermission())) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.88,
      exif: false,
    });

    if (result.canceled || !result.assets[0]?.uri) return null;

    let uri = result.assets[0].uri;

    if (Platform.OS === 'android') {
      uri = await ensureAspectCrop(uri, aspect);
    }

    return uri;
  } catch {
    Alert.alert('Görsel seçilemedi', 'Lütfen tekrar deneyin.');
    return null;
  }
}

export async function pickLogoImage(): Promise<string | null> {
  return pickCroppedProfileImage(LOGO_CROP_ASPECT);
}

export async function pickCoverImage(): Promise<string | null> {
  return pickCroppedProfileImage(COVER_CROP_ASPECT);
}
