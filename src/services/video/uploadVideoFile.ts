import { File, UploadTask, UploadType } from 'expo-file-system';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { sha256HexFromString } from '@/features/vcts/services/contentHash';
import { compressVideoForUpload, type VideoCompressionProfile } from '@/lib/video/compress';
import { kickstartMuxSync } from '@/services/video/muxPoll';
import { isUploadCancelledError, throwIfAborted } from '@/services/video/uploadCancelled';
import type { MuxVideoReservation } from '@/services/video/reserveMuxVideo';

export type VideoFileUploadProgress = {
  stage: 'compressing' | 'uploading';
  progress: number;
};

export type VideoFileUploadOptions = {
  profile?: VideoCompressionProfile;
  skipCompression?: boolean;
  signal?: AbortSignal;
};

/**
 * Önceden ayrılmış Mux slot'una dosya yükler.
 * DB kaydı oluşturmaz — reserveMuxVideo ile birlikte kullanılır.
 */
export async function uploadVideoFileToMux(
  reservation: MuxVideoReservation,
  localUri: string,
  onProgress?: (state: VideoFileUploadProgress) => void,
  options: VideoFileUploadOptions = {},
): Promise<{ sha256: string }> {
  const profile = options.profile ?? 'post';
  const skipCompression = options.skipCompression ?? false;
  const { signal } = options;

  throwIfAborted(signal);

  let uploadUri = localUri;
  if (!skipCompression) {
    onProgress?.({ stage: 'compressing', progress: 0 });
    uploadUri = await compressVideoForUpload(localUri, {
      profile,
      signal,
      onProgress: (progress) => onProgress?.({ stage: 'compressing', progress }),
    });
    onProgress?.({ stage: 'compressing', progress: 1 });
  }

  throwIfAborted(signal);

  const file = new File(normalizeLocalFileUri(uploadUri));
  if (!file.exists) {
    throw new Error('Video dosyası bulunamadı.');
  }

  const fileSize = file.info().size ?? 0;
  onProgress?.({ stage: 'uploading', progress: 0 });

  const uploadTask = new UploadTask(file, reservation.uploadUrl, {
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

  kickstartMuxSync(reservation.videoId);

  const sha256 = await sha256HexFromString(
    `mux:${reservation.videoId}:${reservation.uploadId}:${fileSize}`,
  );

  return { sha256 };
}
