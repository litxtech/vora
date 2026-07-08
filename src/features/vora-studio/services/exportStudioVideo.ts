import { getVideoMetaData } from 'react-native-compressor';
import { buildEditManifest } from '@/features/vora-studio/services/buildEditManifest';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';

export { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';
import type { StudioExportResult } from '@/features/vora-studio/types';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';
import { compressVideoForUpload } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { supabase } from '@/lib/supabase/client';

const PROBE_DURATION_TIMEOUT_MS = 4000;

export async function probeVideoDuration(uri: string): Promise<number> {
  try {
    // getVideoMetaData (react-native-compressor) bazı cihazlarda/yeni kaydedilen
    // dosyalarda hiç resolve olmayabiliyor; bu durumda editör "loading" siyah
    // ekranında takılır. Bir zaman aşımıyla daima sonlanmasını garanti et.
    const meta = await Promise.race([
      getVideoMetaData(uri),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), PROBE_DURATION_TIMEOUT_MS);
      }),
    ]);
    return meta?.duration ?? 0;
  } catch {
    return 0;
  }
}

export async function exportStudioClip(
  username: string,
  onProgress?: (message: string) => void,
): Promise<StudioExportResult> {
  const state = useStudioEditorStore.getState();
  if (!state.sourceUri) {
    throw new Error('Video kaynağı bulunamadı.');
  }

  onProgress?.(VIDEO_PROGRESS.manifestPreparing);
  const manifest = buildEditManifest(state, username);
  if (!manifest) throw new Error('Manifest oluşturulamadı.');

  onProgress?.(VIDEO_PROGRESS.preparing);
  const preparedUri = await prepareLocalVideoUri(state.sourceUri);

  onProgress?.(VIDEO_PROGRESS.thumbnail);
  const thumbnailUri = await captureThumbnail(preparedUri, state.trimStartSec);

  return {
    outputUri: preparedUri,
    manifest,
    jobId: null,
    thumbnailUri,
  };
}

export async function exportStudioVideo(
  userId: string,
  username: string,
  onProgress?: (message: string) => void,
): Promise<StudioExportResult> {
  const state = useStudioEditorStore.getState();
  if (!state.sourceUri) {
    throw new Error('Video kaynağı bulunamadı.');
  }

  onProgress?.(VIDEO_PROGRESS.manifestPreparing);
  const manifest = buildEditManifest(state, username);
  if (!manifest) throw new Error('Manifest oluşturulamadı.');

  onProgress?.(VIDEO_PROGRESS.compressing);
  const compressedUri = await compressVideoForUpload(state.sourceUri, { profile: 'fast' });

  onProgress?.(VIDEO_PROGRESS.thumbnail);
  const thumbnailUri = await captureThumbnail(compressedUri, state.thumbnailTimeSec);

  onProgress?.(VIDEO_PROGRESS.uploading);

  const { data, error } = await supabase.functions.invoke('vora-studio-render', {
    body: {
      userId,
      sourceUri: compressedUri,
      manifest,
      thumbnailTimeSec: state.thumbnailTimeSec,
    },
  });

  if (error) {
    if (__DEV__) {
      console.warn('[vora-studio] render edge function unavailable, using local export', error.message);
    }
    return {
      outputUri: compressedUri,
      manifest,
      jobId: null,
      thumbnailUri,
    };
  }

  const result = data as {
    jobId?: string;
    outputUri?: string;
    thumbnailUri?: string;
  };

  return {
    outputUri: result.outputUri ?? compressedUri,
    manifest,
    jobId: result.jobId ?? null,
    thumbnailUri: result.thumbnailUri ?? thumbnailUri,
  };
}
