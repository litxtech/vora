import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'platform-guide-media';

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

async function uploadGuideMedia(
  guideId: string,
  localUri: string,
  kind: 'image' | 'video',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = kind === 'video' ? guessVideoContentType(localUri) : guessImageContentType(localUri);
    const ext = fileExtension(contentType);
    const path = `${guideId}/${kind}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadPlatformGuideImage(
  guideId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  if (localUri.startsWith('http')) return { url: localUri, error: null };
  return uploadGuideMedia(guideId, localUri, 'image');
}

export async function uploadPlatformGuideVideo(
  guideId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  if (localUri.startsWith('http')) return { url: localUri, error: null };
  return uploadGuideMedia(guideId, localUri, 'video');
}
