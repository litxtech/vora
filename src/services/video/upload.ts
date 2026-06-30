import { File, UploadTask, UploadType } from 'expo-file-system';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { sha256HexFromString } from '@/features/vcts/services/contentHash';
import { hashFileUri } from '@/features/vcts/services/contentHash';
import { compressVideoForUpload, type VideoCompressionProfile } from '@/lib/video/compress';
import { createMuxDirectUpload } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';
import { kickstartMuxSync } from '@/services/video/muxPoll';
import { isUploadCancelledError, throwIfAborted } from '@/services/video/uploadCancelled';
import { reserveMuxVideo } from '@/services/video/reserveMuxVideo';
import { uploadVideoFileToMux } from '@/services/video/uploadVideoFile';

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

export type VideoUploadRecord = {
  id: string;
  sha256: string;
};

export type VideoUploadOptions = {
  profile?: VideoCompressionProfile;
  /** Vora Studio çıktısı gibi zaten sıkıştırılmış dosyalar için */
  skipCompression?: boolean;
  signal?: AbortSignal;
};

/**
 * Video akışı: sıkıştır → Mux'a yükle → DB kaydı oluştur
 * (Reels / eski çağrılar — gönderi paylaşımı reserve + uploadReservedPostVideo kullanır)
 */
export async function uploadVideo(
  input: VideoUploadInput,
  onProgress?: (state: VideoUploadProgress) => void,
  options: VideoUploadOptions = {},
): Promise<VideoUploadRecord> {
  const profile = options.profile ?? 'quality';
  const skipCompression = options.skipCompression ?? false;
  const { signal } = options;

  throwIfAborted(signal);
  onProgress?.({ stage: 'compressing', progress: 0 });

  const muxUpload = await createMuxDirectUpload('video.mp4', 'video/mp4');

  let compressedUri = input.uri;
  if (!skipCompression) {
    compressedUri = await compressVideoForUpload(input.uri, {
      profile,
      signal,
      onProgress: (progress) => onProgress?.({ stage: 'compressing', progress }),
    });
  }

  throwIfAborted(signal);
  onProgress?.({ stage: 'compressing', progress: 1 });

  const file = new File(normalizeLocalFileUri(compressedUri));
  if (!file.exists) {
    throw new Error('Sıkıştırılmış video bulunamadı.');
  }

  onProgress?.({ stage: 'uploading', progress: 0 });

  const fileSize = file.info().size ?? 0;
  const sha256 =
    profile === 'fast' || profile === 'post'
      ? await sha256HexFromString(`pending:${compressedUri}:${fileSize}`)
      : await hashFileUri(compressedUri);

  throwIfAborted(signal);

  const uploadTask = new UploadTask(file, muxUpload.uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'video/mp4' },
    signal,
    onProgress: (data) => {
      const progress = data.totalBytes > 0 ? data.bytesSent / data.totalBytes : 0;
      onProgress?.({ stage: 'uploading', progress });
    },
  });

  let uploadResult;
  try {
    uploadResult = await uploadTask.uploadAsync();
  } catch (err) {
    if (isUploadCancelledError(err)) {
      uploadTask.cancel();
      throw err;
    }
    throw err;
  }

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error('Mux yükleme başarısız.');
  }

  onProgress?.({ stage: 'uploading', progress: 1 });
  throwIfAborted(signal);

  const videoRow = {
    owner_id: input.ownerId,
    region_id: input.regionId,
    title: input.title ?? null,
    description: input.description ?? null,
    mux_upload_id: muxUpload.uploadId,
    mux_asset_id: muxUpload.assetId ?? null,
    status: 'processing' as const,
  };

  const { data, error } = await supabase.from('videos').insert(videoRow).select().single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Video kaydı oluşturulamadı (yetki). Sunucu güncellemesi gerekebilir.');
    }
    throw error;
  }

  onProgress?.({ stage: 'processing', progress: 0.5 });

  kickstartMuxSync(data.id);

  const finalSha256 =
    profile === 'fast' || profile === 'post'
      ? await sha256HexFromString(`mux:${data.id}:${muxUpload.uploadId}`)
      : sha256;

  return { ...data, sha256: finalSha256 };
}

/** Rezerve slot + dosya yükleme — uploadVideo ile aynı sonuç, iki aşamalı. */
export async function uploadVideoReserved(
  input: VideoUploadInput,
  onProgress?: (state: VideoUploadProgress) => void,
  options: VideoUploadOptions = {},
): Promise<VideoUploadRecord> {
  const reservation = await reserveMuxVideo({
    ownerId: input.ownerId,
    regionId: input.regionId,
    title: input.title ?? null,
    description: input.description ?? null,
  });

  const { sha256 } = await uploadVideoFileToMux(
    reservation,
    input.uri,
    (state) => {
      if (state.stage === 'compressing' || state.stage === 'uploading') {
        onProgress?.({ stage: state.stage, progress: state.progress });
      }
    },
    options,
  );

  return { id: reservation.videoId, sha256 };
}
