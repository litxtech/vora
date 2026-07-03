import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

/** Hikâye görseli — 1080px, düşük JPEG kalitesi; yavaş ağda daha hızlı yükleme. */
const STORY_IMAGE_MAX_WIDTH = 1080;
const STORY_IMAGE_QUALITY = 0.72;

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
      { compress: STORY_IMAGE_QUALITY, format: SaveFormat.JPEG },
    );
    const bytes = await readLocalFileBytes(compressed.uri);
    const path = `${userId}/${Date.now()}_story.jpg`;

    const { error } = await supabase.storage.from('post-media').upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      return { mediaUrl: null, thumbUrl: null, error: supabaseErrorMessage(error)! };
    }

    const { data } = supabase.storage.from('post-media').getPublicUrl(path);
    return { mediaUrl: data.publicUrl, thumbUrl: data.publicUrl, error: null };
  } catch (err) {
    return {
      mediaUrl: null,
      thumbUrl: null,
      error: err instanceof Error ? err.message : 'Görsel yüklenemedi.',
    };
  }
}
