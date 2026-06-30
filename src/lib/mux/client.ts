import { supabase } from '@/lib/supabase/client';
import { edgeFunctionErrorMessage } from '@/lib/errors';

export type MuxUploadResult = {
  uploadUrl: string;
  uploadId: string;
  assetId?: string | null;
  status: 'waiting' | 'processing' | 'ready' | 'error';
};

export type MuxSyncResult = {
  status: 'processing' | 'ready' | 'error';
  playbackId?: string;
  thumbnailUrl?: string;
};

/**
 * Mux yükleme işlemi Supabase Edge Function üzerinden yapılır.
 * Token'lar istemciye verilmez — güvenli sunucu tarafı akışı.
 */
export async function createMuxDirectUpload(fileName: string, contentType: string) {
  const { data, error } = await supabase.functions.invoke<MuxUploadResult & { error?: string }>(
    'mux-create-upload',
    {
      body: { fileName, contentType },
    },
  );

  if (error) {
    throw new Error(
      await edgeFunctionErrorMessage(error, data, {
        fallback: 'Video yükleme adresi alınamadı. Lütfen tekrar deneyin.',
      }),
    );
  }

  if (data && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }

  if (!data?.uploadUrl || !data?.uploadId) {
    throw new Error('Mux upload oluşturulamadı.');
  }

  return data;
}

export async function syncMuxVideo(videoId: string): Promise<MuxSyncResult> {
  const { data, error } = await supabase.functions.invoke<MuxSyncResult>('mux-sync-upload', {
    body: { videoId },
  });

  if (error) throw error;
  return data ?? { status: 'processing' };
}

export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function extractMuxPlaybackId(url: string): string | null {
  const match = url.match(/(?:stream|image)\.mux\.com\/([^./?]+)/);
  return match?.[1] ?? null;
}

export function getMuxThumbnailUrl(playbackId: string, time = 1): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
}
