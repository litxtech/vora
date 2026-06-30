import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function brandingStoragePath(ownerId: string, kind: 'logo' | 'cover', ext: string): string {
  // avatars bucket RLS: ilk klasör auth.uid() olmalı (mevcut profil politikası)
  return `${ownerId}/business-${kind}.${ext}`;
}

async function uploadBusinessImage(
  ownerId: string,
  localUri: string,
  kind: 'logo' | 'cover',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = brandingStoragePath(ownerId, kind, ext);

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

    if (uploadError) {
      const message = uploadError.message.includes('row-level security')
        ? 'Görsel yüklenemedi. Oturumunuzu kontrol edip tekrar deneyin.'
        : uploadError.message;
      return { url: null, error: message };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadBusinessLogo(ownerId: string, localUri: string) {
  return uploadBusinessImage(ownerId, localUri, 'logo');
}

export async function uploadBusinessCover(ownerId: string, localUri: string) {
  return uploadBusinessImage(ownerId, localUri, 'cover');
}

export type UpdateBusinessBrandingInput = {
  name?: string;
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  district?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
};

export async function updateBusinessBranding(
  businessId: string,
  ownerId: string,
  input: UpdateBusinessBrandingInput,
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.website !== undefined) patch.website = input.website;
  if (input.address !== undefined) patch.address = input.address;
  if (input.district !== undefined) patch.district = input.district;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
  if (input.coverUrl !== undefined) patch.cover_url = input.coverUrl;

  if (!Object.keys(patch).length) return { error: null };

  const { error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', businessId)
    .eq('owner_id', ownerId);

  return { error: supabaseErrorMessage(error) };
}
