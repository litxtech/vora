import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { hashMediaBytes } from '@/features/vcts/services/contentHash';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'mp4' || ext === 'mov') return 'video/mp4';
  return 'image/jpeg';
}

async function prepareUploadBytes(
  localUri: string,
  contentType: string,
): Promise<{ bytes: ArrayBuffer; contentType: string; ext: string }> {
  const isImage = contentType.startsWith('image/') && contentType !== 'image/gif';
  if (!isImage) {
    const bytes = await readLocalFileBytes(localUri);
    const ext = contentType.split('/')[1] ?? 'bin';
    return { bytes, contentType, ext };
  }

  const maxWidth = isAndroidTablet() ? 1600 : Platform.OS === 'android' ? 1920 : 2048;
  const compressed = await manipulateAsync(
    localUri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.82, format: SaveFormat.JPEG },
  );
  const bytes = await readLocalFileBytes(compressed.uri);
  return { bytes, contentType: 'image/jpeg', ext: 'jpg' };
}

export type PostMediaUploadResult = {
  url: string | null;
  storagePath: string | null;
  sha256: string | null;
  error: string | null;
};

export async function uploadPostMedia(
  userId: string,
  localUri: string,
  index: number,
): Promise<PostMediaUploadResult> {
  try {
    const guessedType = guessContentType(localUri);
    const { bytes, contentType, ext } = await prepareUploadBytes(localUri, guessedType);
    const sha256 = await hashMediaBytes(bytes);
    const path = `${userId}/${Date.now()}_${index}.${ext}`;

    const { error } = await supabase.storage.from('post-media').upload(path, bytes, {
      contentType,
      upsert: false,
    });

    if (error) return { url: null, storagePath: null, sha256: null, error: supabaseErrorMessage(error)! };

    const { data } = supabase.storage.from('post-media').getPublicUrl(path);
    return { url: data.publicUrl, storagePath: path, sha256, error: null };
  } catch (err) {
    return { url: null, storagePath: null, sha256: null, error: String(err) };
  }
}
