import { supabase } from '@/lib/supabase/client';

export type MuxUploadResult = {
  uploadId: string;
  assetId?: string;
  playbackId?: string;
  status: 'waiting' | 'processing' | 'ready' | 'error';
};

/**
 * Mux yükleme işlemi Supabase Edge Function üzerinden yapılır.
 * Token'lar istemciye verilmez — güvenli sunucu tarafı akışı.
 */
export async function createMuxDirectUpload(fileName: string, contentType: string) {
  const { data, error } = await supabase.functions.invoke<MuxUploadResult>('mux-create-upload', {
    body: { fileName, contentType },
  });

  if (error) throw error;
  if (!data?.uploadId) throw new Error('Mux upload oluşturulamadı.');

  return data;
}

export async function getMuxAssetStatus(assetId: string) {
  const { data, error } = await supabase.functions.invoke<MuxUploadResult>('mux-asset-status', {
    body: { assetId },
  });

  if (error) throw error;
  return data;
}

export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(playbackId: string, time = 1): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
}
