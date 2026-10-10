import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';

export async function uploadJobWorkplaceImage(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const prepared = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.WEBP });
    const bytes = await readLocalFileBytes(prepared.uri);
    const uploaded = await uploadPublicImage({
      folder: 'job-listings',
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

export async function uploadJobWorkplaceImages(userId: string, uris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (uri.startsWith('http')) {
      urls.push(uri);
      continue;
    }
    const { url } = await uploadJobWorkplaceImage(userId, uri, i);
    if (url) urls.push(url);
  }
  return urls;
}
