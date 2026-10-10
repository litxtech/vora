import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';

export async function uploadCommunityCover(
  userId: string,
  communityId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  return uploadCommunityImage(userId, communityId, localUri, 'cover');
}

export async function uploadCommunityIcon(
  userId: string,
  communityId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  return uploadCommunityImage(userId, communityId, localUri, 'icon');
}

async function uploadCommunityImage(
  userId: string,
  communityId: string,
  localUri: string,
  kind: 'cover' | 'icon',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const prepared = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.WEBP });
    const bytes = await readLocalFileBytes(prepared.uri);
    const uploaded = await uploadPublicImage({
      folder: 'covers',
      path: `${userId}/communities/${communityId}/${kind}-${Date.now()}.webp`,
      bytes,
      contentType: 'image/webp',
    });
    if (uploaded.error || !uploaded.url) return { url: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    return { url: uploaded.url, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
