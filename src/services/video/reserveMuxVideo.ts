import { createMuxDirectUpload } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';

export type MuxVideoReservation = {
  videoId: string;
  uploadUrl: string;
  uploadId: string;
  assetId: string | null;
};

/** Mux slot + DB kaydı — dosya yüklenmeden önce videoId alınır (anında paylaşım). */
export async function reserveMuxVideo(input: {
  ownerId: string;
  regionId: string;
  title?: string | null;
  description?: string | null;
}): Promise<MuxVideoReservation> {
  const muxUpload = await createMuxDirectUpload('video.mp4', 'video/mp4');

  const { data, error } = await supabase
    .from('videos')
    .insert({
      owner_id: input.ownerId,
      region_id: input.regionId,
      title: input.title ?? null,
      description: input.description ?? null,
      mux_upload_id: muxUpload.uploadId,
      mux_asset_id: muxUpload.assetId ?? null,
      status: 'uploading',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Video kaydı oluşturulamadı (yetki). Sunucu güncellemesi gerekebilir.');
    }
    throw error;
  }

  return {
    videoId: data.id,
    uploadUrl: muxUpload.uploadUrl,
    uploadId: muxUpload.uploadId,
    assetId: muxUpload.assetId ?? null,
  };
}
