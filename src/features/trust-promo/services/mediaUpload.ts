import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'app-appearance-media';
const PROMO_IMAGE_PATH = 'trust-vacation-promo/promo';

function guessImageContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function fileExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/heic') return 'heic';
  return 'jpg';
}

export async function uploadTrustVacationPromoImage(
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  if (localUri.startsWith('http')) {
    return { url: localUri, error: null };
  }

  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessImageContentType(localUri);
    const ext = fileExtension(contentType);
    const path = `${PROMO_IMAGE_PATH}.${ext}`;

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

export async function removeTrustVacationPromoImage(): Promise<{ error: string | null }> {
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
  const paths = extensions.map((ext) => `${PROMO_IMAGE_PATH}.${ext}`);

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  return { error: error?.message ?? null };
}
