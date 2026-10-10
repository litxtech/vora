import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';

/** Hikâye görseli — 1080px WebP. Piksel aynı, dosya daha küçük. */
const STORY_IMAGE_MAX_WIDTH = 1080;
const STORY_IMAGE_QUALITY = 0.9;

export type UploadStoryImageResult = {
  mediaUrl: string | null;
  thumbUrl: string | null;
  error: string | null;
};

export async function uploadStoryImage(
  userId: string,
  localUri: string,
): Promise<UploadStoryImageResult> {
  try {
    const compressed = await manipulateAsync(
      localUri,
      [{ resize: { width: STORY_IMAGE_MAX_WIDTH } }],
      { compress: STORY_IMAGE_QUALITY, format: SaveFormat.WEBP },
    );
    const bytes = await readLocalFileBytes(compressed.uri);
    const path = `${userId}/${Date.now()}_story.webp`;
    const uploaded = await uploadPublicImage({
      folder: 'post-media',
      path,
      bytes,
      contentType: 'image/webp',
    });
    if (uploaded.error || !uploaded.url) {
      return { mediaUrl: null, thumbUrl: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    }
    return { mediaUrl: uploaded.url, thumbUrl: uploaded.url, error: null };
  } catch (err) {
    return {
      mediaUrl: null,
      thumbUrl: null,
      error: err instanceof Error ? err.message : 'Görsel yüklenemedi.',
    };
  }
}
