import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function guessCompletionProofContentType(uri: string): string {
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  return 'image/jpeg';
}

function fileExtension(contentType: string): string {
  if (contentType.startsWith('video/')) {
    if (contentType.includes('quicktime')) return 'mov';
    return 'mp4';
  }
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadCompletionProofMedia(
  userId: string,
  requestId: string,
  localUri: string,
  kind: 'image' | 'video',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessCompletionProofContentType(localUri);
    if (kind === 'image' && contentType.startsWith('video/')) {
      return { url: null, error: 'Lütfen bir fotoğraf seçin.' };
    }
    if (kind === 'video' && !contentType.startsWith('video/')) {
      return { url: null, error: 'Lütfen bir video seçin.' };
    }

    const ext = fileExtension(contentType);
    const path = `${userId}/completion-proof/${requestId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('vora-hizmetler').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('vora-hizmetler').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function submitServiceCompletionProof(
  requestId: string,
  input: { imageUrl?: string | null; videoUrl?: string | null },
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc('submit_vora_service_completion_proof', {
    p_request_id: requestId,
    p_image_url: input.imageUrl ?? null,
    p_video_url: input.videoUrl ?? null,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'Kanıt gönderilemedi.' };
  return {};
}
