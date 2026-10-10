import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

async function uploadBusinessImage(
  ownerId: string,
  localUri: string,
  kind: 'logo' | 'cover',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const prepared = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.WEBP });
    const bytes = await readLocalFileBytes(prepared.uri);
    const uploaded = await uploadPublicImage({
      folder: 'avatars',
      path: `${ownerId}/business-${kind}-${Date.now()}.webp`,
      bytes,
      contentType: 'image/webp',
    });
    if (uploaded.error || !uploaded.url) return { url: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    return { url: uploaded.url, error: null };
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
