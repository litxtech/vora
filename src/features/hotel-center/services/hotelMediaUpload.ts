import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

function guessImageContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function guessVideoContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.mov')) return 'video/quicktime';
  if (lower.includes('.webm')) return 'video/webm';
  return 'video/mp4';
}

function fileExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/heic') return 'heic';
  if (contentType === 'video/quicktime') return 'mov';
  if (contentType === 'video/webm') return 'webm';
  if (contentType.startsWith('video/')) return 'mp4';
  return 'jpg';
}

async function uploadHotelMedia(
  userId: string,
  localUri: string,
  index: number,
  kind: 'image' | 'video',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = kind === 'video' ? guessVideoContentType(localUri) : guessImageContentType(localUri);
    const ext = fileExtension(contentType);
    const folder = kind === 'video' ? 'videos' : 'images';
    const path = `${userId}/${folder}/${Date.now()}-${index}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('hotel-listings').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('hotel-listings').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadHotelImage(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  return uploadHotelMedia(userId, localUri, index, 'image');
}

export async function uploadHotelVideo(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  return uploadHotelMedia(userId, localUri, index, 'video');
}

async function uploadRemoteAware(
  userId: string,
  uris: string[],
  kind: 'image' | 'video',
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (uri.startsWith('http')) {
      urls.push(uri);
      continue;
    }
    const { url } = await uploadHotelMedia(userId, uri, i, kind);
    if (url) urls.push(url);
  }
  return urls;
}

export async function uploadHotelImages(userId: string, uris: string[]): Promise<string[]> {
  return uploadRemoteAware(userId, uris, 'image');
}

export async function uploadHotelVideos(userId: string, uris: string[]): Promise<string[]> {
  return uploadRemoteAware(userId, uris, 'video');
}
