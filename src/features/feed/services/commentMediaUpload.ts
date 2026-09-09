import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';

const MAX_COMMENT_IMAGES = 4;

export type CommentMediaUploadBatch = {
  urls: string[];
  error: string | null;
};

/** Yorum galeri görsellerini post-media bucket'ına yükler. */
export async function uploadCommentMedia(
  userId: string,
  localUris: string[],
): Promise<CommentMediaUploadBatch> {
  const uris = localUris.slice(0, MAX_COMMENT_IMAGES);
  if (uris.length === 0) return { urls: [], error: null };

  const urls: string[] = [];
  for (let i = 0; i < uris.length; i += 1) {
    const result = await uploadPostMedia(userId, uris[i], i);
    if (result.error || !result.url) {
      return { urls, error: result.error ?? 'Görsel yüklenemedi' };
    }
    urls.push(result.url);
  }

  return { urls, error: null };
}

export { MAX_COMMENT_IMAGES };
