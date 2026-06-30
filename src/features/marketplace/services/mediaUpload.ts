import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { isVideoUrl } from '@/features/marketplace/services/descriptionBlocks';

export type MarketplaceMediaUploadBatch = {
  urls: string[];
  error: string | null;
};

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/jpeg';
  if (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.m4v')) return 'video/mp4';
  if (lower.includes('.webm')) return 'video/webm';
  if (isVideoUrl(uri)) return 'video/mp4';
  return 'image/jpeg';
}

function fileExtension(contentType: string, uri: string): string {
  if (contentType.startsWith('video/')) return contentType.split('/')[1] ?? 'mp4';
  const lower = uri.toLowerCase();
  if (lower.includes('.heic') || lower.includes('.heif')) return 'jpg';
  return contentType.split('/')[1] ?? 'jpg';
}

export async function uploadMarketplaceMedia(
  userId: string,
  localUri: string,
  index: number,
  folder: 'listings' | 'comments' | 'descriptions' = 'listings',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri);
    const ext = fileExtension(contentType, localUri);
    // RLS: auth.uid() = storage.foldername(name)[1] — kullanıcı id ilk klasör olmalı
    const path = `${userId}/${folder}/${Date.now()}-${index}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('marketplace-listings').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      const message = uploadError.message.includes('row-level security')
        ? 'Görsel yüklenemedi. Oturumunuzu kontrol edip tekrar deneyin.'
        : uploadError.message;
      return { url: null, error: message };
    }

    const { data } = supabase.storage.from('marketplace-listings').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadMarketplaceImage(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  return uploadMarketplaceMedia(userId, localUri, index, 'listings');
}

async function uploadMarketplaceMediaBatch(
  userId: string,
  uris: string[],
  folder: 'listings' | 'comments' | 'descriptions',
): Promise<MarketplaceMediaUploadBatch> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const { url, error } = await uploadMarketplaceMedia(userId, uris[i], i, folder);
    if (error) return { urls, error };
    if (url) urls.push(url);
  }
  return { urls, error: null };
}

export async function uploadMarketplaceImages(
  userId: string,
  uris: string[],
): Promise<MarketplaceMediaUploadBatch> {
  return uploadMarketplaceMediaBatch(userId, uris, 'listings');
}

export async function uploadMarketplaceCommentMedia(
  userId: string,
  uris: string[],
): Promise<MarketplaceMediaUploadBatch> {
  return uploadMarketplaceMediaBatch(userId, uris, 'comments');
}

export async function uploadMarketplaceDescriptionMedia(
  userId: string,
  uris: string[],
): Promise<MarketplaceMediaUploadBatch> {
  return uploadMarketplaceMediaBatch(userId, uris, 'descriptions');
}
