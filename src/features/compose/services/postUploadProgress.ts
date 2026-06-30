import { blendUploadProgress, estimateVideoUploadEtaSec } from '@/services/video/uploadEta';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';

export function mapVideoProgressToOverall(
  mediaIndex: number,
  mediaCount: number,
  stage: 'preparing' | 'compressing' | 'uploading',
  stageProgress: number,
  fileSizeBytes?: number,
): { progress: number; message: string; etaSec: number | null } {
  const blended = blendUploadProgress(stage, stageProgress);
  const mediaSpan = 0.75 / Math.max(mediaCount, 1);
  const mediaBase = (mediaIndex / Math.max(mediaCount, 1)) * 0.75;
  const progress = mediaBase + blended * mediaSpan;
  const message =
    stage === 'preparing'
      ? VIDEO_PROGRESS.preparing
      : stage === 'compressing'
        ? VIDEO_PROGRESS.compressing
        : VIDEO_PROGRESS.uploading;
  const etaSec =
    fileSizeBytes && stage !== 'preparing'
      ? estimateVideoUploadEtaSec(
          fileSizeBytes,
          stage === 'compressing' ? 'compressing' : 'uploading',
          stageProgress,
        )
      : null;
  return { progress, message, etaSec };
}

/** Gönderi kaydedildi, video arka planda yükleniyor — UI anında başarı gösterebilir. */
export function mapPublishedProgress(): { progress: number; message: string } {
  return { progress: 0.78, message: 'Gönderi paylaşıldı, video yükleniyor...' };
}

/** Arka plan video yüklemesi ilerlemesi (0.78–0.98 aralığı). */
export function mapBackgroundVideoProgress(
  mediaIndex: number,
  mediaCount: number,
  stage: 'compressing' | 'uploading',
  stageProgress: number,
  fileSizeBytes?: number,
): { progress: number; message: string; etaSec: number | null } {
  const span = 0.2 / Math.max(mediaCount, 1);
  const base = 0.78 + (mediaIndex / Math.max(mediaCount, 1)) * span;
  const inner = stage === 'compressing' ? stageProgress * 0.35 : 0.35 + stageProgress * 0.65;
  const progress = base + inner * span;
  const message =
    stage === 'compressing' ? VIDEO_PROGRESS.compressing : VIDEO_PROGRESS.uploading;
  const etaSec =
    fileSizeBytes != null
      ? estimateVideoUploadEtaSec(
          fileSizeBytes,
          stage === 'compressing' ? 'compressing' : 'uploading',
          stageProgress,
        )
      : null;
  return { progress, message, etaSec };
}
