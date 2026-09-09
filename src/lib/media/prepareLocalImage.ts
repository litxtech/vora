import { cacheDirectory, copyAsync, getInfoAsync } from 'expo-file-system/legacy';
import { getLocalFileSize, normalizeLocalFileUri } from '@/lib/files/readLocalFile';

const PREPARED_IMAGE_MARKER = '/upload-image-';

function extFromUri(uri: string, mimeType?: string | null): string {
  if (mimeType) {
    if (mimeType.includes('png')) return '.png';
    if (mimeType.includes('webp')) return '.webp';
    if (mimeType.includes('heic') || mimeType.includes('heif')) return '.heic';
    if (mimeType.includes('gif')) return '.gif';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  }
  const match = uri.match(/\.(jpe?g|png|webp|heic|heif|gif)(\?|$)/i);
  return match ? `.${match[1]!.toLowerCase()}` : '.jpg';
}

/** Image picker / galeri URI'sini uygulama önbelleğine kopyalar — Android ImagePicker cache temizliğine karşı. */
export async function prepareLocalImageUri(uri: string, mimeType?: string | null): Promise<string> {
  if (!uri) throw new Error('Fotoğraf dosyası bulunamadı.');

  const normalized = normalizeLocalFileUri(uri);
  if (isPreparedLocalImageUri(normalized)) {
    return normalized;
  }

  const info = await getInfoAsync(normalized);
  if (!info.exists) {
    throw new Error('Fotoğraf dosyası okunamadı.');
  }

  const dest = `${cacheDirectory}upload-image-${Date.now()}-${Math.random().toString(36).slice(2)}${extFromUri(normalized, mimeType)}`;
  await copyAsync({ from: normalized, to: dest });

  const copied = await getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('Fotoğraf dosyası okunamadı.');
  }

  return dest;
}

/** prepareLocalImageUri ile önbelleğe alınmış görsel — tekrar kopyalamayı önler. */
export function isPreparedLocalImageUri(uri: string | null | undefined): boolean {
  if (!uri?.trim()) return false;
  const normalized = normalizeLocalFileUri(uri.trim());
  if (!normalized.includes(PREPARED_IMAGE_MARKER)) return false;
  return getLocalFileSize(normalized) > 0;
}
