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

  const uploaded = await Promise.all(uris.map((uri, index) => uploadPostMedia(userId, uri, index)));
  const failed = uploaded.find((item) => item.error || !item.url);
  if (failed) return { urls: [], error: failed.error ?? 'Görsel yüklenemedi' };
  return { urls: uploaded.map((item) => item.url as string), error: null };
}

export { MAX_COMMENT_IMAGES };
