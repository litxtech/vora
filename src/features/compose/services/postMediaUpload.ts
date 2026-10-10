import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image, Platform } from 'react-native';
import { hashMediaBytes } from '@/features/vcts/services/contentHash';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { completePublicImageUpload, reservePublicImageUpload } from '@/lib/media-cloud/uploadPublicImage';
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
  try {
    const width = await readImageWidth(localUri);
    const compressed = await manipulateAsync(
      localUri,
      width != null && width <= maxWidth ? [] : [{ resize: { width: maxWidth } }],
      { compress: 0.9, format: SaveFormat.WEBP },
    );
    const bytes = await readLocalFileBytes(compressed.uri);
    return { bytes, contentType: 'image/webp', ext: 'webp' };
  } catch {
    // renderAsync / "image content has been lost" — orijinal dosyayı yükle
    const bytes = await readLocalFileBytes(localUri);
    const ext =
      contentType === 'image/png'
        ? 'png'
        : contentType === 'image/webp'
          ? 'webp'
          : contentType === 'image/heic' || contentType === 'image/heif'
            ? 'heic'
            : 'jpg';
    return { bytes, contentType, ext };
  }
}

export type PostMediaUploadResult = {
  url: string | null;
  storagePath: string | null;
  sha256: string | null;
  error: string | null;
};

function readImageWidth(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width) => resolve(width > 0 ? width : null),
      () => resolve(null),
    );
  });
}

export async function uploadPostMedia(
  userId: string,
  localUri: string,
  index: number,
  kind?: 'image' | 'video',
): Promise<PostMediaUploadResult> {
  try {
    const guessedType = kind === 'video' ? 'video/mp4' : guessContentType(localUri);
    const directImage = guessedType.startsWith('image/') && guessedType !== 'image/gif';
    if (directImage) {
      const path = `${userId}/${Date.now()}_${index}.webp`;
      const [prepared, reserved] = await Promise.all([
        prepareUploadBytes(localUri, guessedType),
        reservePublicImageUpload({ folder: 'post-media', path, contentType: 'image/webp' }),
      ]);
      const ticket = prepared.contentType === 'image/webp' ? reserved.ticket : null;
      const uploading = ticket
        ? completePublicImageUpload(ticket, prepared.bytes)
        : (async () => {
            const again = await reservePublicImageUpload({
              folder: 'post-media',
              path: `${userId}/${Date.now()}_${index}.${prepared.ext}`,
              contentType: prepared.contentType,
            });
            if (!again.ticket) return { url: null, storagePath: null, error: again.error };
            return completePublicImageUpload(again.ticket, prepared.bytes);
          })();
      const sha256 = await hashMediaBytes(prepared.bytes);
      const uploaded = await uploading;
      if (uploaded.error || !uploaded.url) {
        return { url: null, storagePath: null, sha256: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
      }
      return { url: uploaded.url, storagePath: uploaded.storagePath, sha256, error: null };
    }

    const { bytes, contentType, ext } = await prepareUploadBytes(localUri, guessedType);
    const sha256 = await hashMediaBytes(bytes);
    const path = `${userId}/${Date.now()}_${index}.${ext}`;

    if (contentType.startsWith('image/')) {
      const reserved = await reservePublicImageUpload({ folder: 'post-media', path, contentType });
      if (!reserved.ticket) {
        return { url: null, storagePath: null, sha256: null, error: reserved.error ?? 'Görsel yüklenemedi.' };
      }
      const uploaded = await completePublicImageUpload(reserved.ticket, bytes);
      if (uploaded.error || !uploaded.url) {
        return { url: null, storagePath: null, sha256: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
      }
      return { url: uploaded.url, storagePath: uploaded.storagePath, sha256, error: null };
    }

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
