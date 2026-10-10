import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';

async function prepareWebp(localUri: string): Promise<ArrayBuffer> {
  const prepared = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.WEBP });
  return readLocalFileBytes(prepared.uri);
}

export async function uploadLostItemImage(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const bytes = await prepareWebp(localUri);
    const uploaded = await uploadPublicImage({
      folder: 'lost-items',
      path: `${userId}/${Date.now()}-${index}.webp`,
      bytes,
      contentType: 'image/webp',
    });
    if (uploaded.error || !uploaded.url) return { url: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    return { url: uploaded.url, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadLostItemImages(userId: string, uris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const { url } = await uploadLostItemImage(userId, uris[i], i);
    if (url) urls.push(url);
  }
  return urls;
}
