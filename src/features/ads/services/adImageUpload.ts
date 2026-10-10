import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';

export async function uploadAdCreativeImage(
  userId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const prepared = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.WEBP });
    const bytes = await readLocalFileBytes(prepared.uri);
    const uploaded = await uploadPublicImage({
      folder: 'covers',
      path: `${userId}/ads/${Date.now()}.webp`,
      bytes,
      contentType: 'image/webp',
    });
    if (uploaded.error || !uploaded.url) return { url: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    return { url: uploaded.url, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
