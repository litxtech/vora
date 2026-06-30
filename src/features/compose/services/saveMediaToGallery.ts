import * as MediaLibrary from 'expo-media-library/legacy';

export async function saveUriToGallery(
  uri: string,
  mediaType: 'photo' | 'video',
): Promise<{ ok: boolean; error?: string }> {
  if (!uri) {
    return { ok: false, error: 'Kaydedilecek dosya bulunamadı.' };
  }

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: 'Galeriye kaydetmek için izin vermelisiniz.' };
  }

  try {
    await MediaLibrary.saveToLibraryAsync(uri, mediaType);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Dosya galeriye kaydedilemedi.' };
  }
}
