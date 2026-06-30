export type VideoUploadEtaStage = 'compressing' | 'uploading' | 'saving';

export function estimateVideoUploadEtaSec(
  fileSizeBytes: number,
  stage: VideoUploadEtaStage,
  stageProgress: number,
): number {
  const compressSec = Math.max(3, Math.ceil(fileSizeBytes / 2_000_000));
  const uploadBytesPerSec = 750_000;
  const savingSec = 4;
  const clamped = Math.min(Math.max(stageProgress, 0), 1);

  if (stage === 'compressing') {
    return Math.max(2, Math.ceil(compressSec * (1 - clamped) + fileSizeBytes / uploadBytesPerSec + savingSec));
  }

  if (stage === 'uploading') {
    const uploadRemaining = (fileSizeBytes / uploadBytesPerSec) * (1 - clamped);
    return Math.max(1, Math.ceil(uploadRemaining + savingSec));
  }

  return Math.max(1, Math.ceil(savingSec * (1 - clamped)));
}

/** Aşamaları ağırlıklı birleştirir (0–1). */
export function blendUploadProgress(
  stage: 'preparing' | 'compressing' | 'uploading' | 'saving' | 'done',
  stageProgress: number,
): number {
  const p = Math.min(Math.max(stageProgress, 0), 1);
  switch (stage) {
    case 'preparing':
      return p * 0.05;
    case 'compressing':
      return 0.05 + p * 0.3;
    case 'uploading':
      return 0.35 + p * 0.45;
    case 'saving':
      return 0.8 + p * 0.18;
    case 'done':
      return 1;
    default:
      return p;
  }
}
