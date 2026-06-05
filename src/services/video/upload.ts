import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system';
import { compressVideoForUpload } from '@/lib/video/compress';
import { createMuxDirectUpload } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';

export type VideoUploadInput = {
  uri: string;
  ownerId: string;
  regionId: string;
  title?: string;
  description?: string;
};

export type VideoUploadProgress = {
  stage: 'compressing' | 'uploading' | 'processing' | 'done';
  progress: number;
};

/**
 * Video akışı: sıkıştır → Mux'a yükle → DB kaydı oluştur
 */
export async function uploadVideo(
  input: VideoUploadInput,
  onProgress?: (state: VideoUploadProgress) => void,
) {
  onProgress?.({ stage: 'compressing', progress: 0 });

  const compressedUri = await compressVideoForUpload(input.uri);
  onProgress?.({ stage: 'compressing', progress: 1 });

  const fileInfo = await FileSystem.getInfoAsync(compressedUri);
  if (!fileInfo.exists) {
    throw new Error('Sıkıştırılmış video bulunamadı.');
  }

  onProgress?.({ stage: 'uploading', progress: 0 });

  const muxUpload = await createMuxDirectUpload('video.mp4', 'video/mp4');

  const uploadResult = await uploadAsync(muxUpload.uploadId, compressedUri, {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'video/mp4' },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error('Mux yükleme başarısız.');
  }

  onProgress?.({ stage: 'uploading', progress: 1 });

  const videoRow = {
    owner_id: input.ownerId,
    region_id: input.regionId,
    title: input.title ?? null,
    description: input.description ?? null,
    mux_upload_id: muxUpload.uploadId,
    status: 'processing' as const,
  };

  const { data, error } = await supabase.from('videos').insert(videoRow).select().single();

  if (error) throw error;

  onProgress?.({ stage: 'processing', progress: 0.5 });

  return data;
}
