import { publishPostAsReel } from '@/features/compose/services/publishPostAsReel';
import { getLocalFileSize } from '@/lib/files/readLocalFile';
import { shouldSkipVideoCompression } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import type { MusicSelection } from '@/features/music/types';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { recordAudioUsage } from '@/features/sounds/services/recordSoundUsage';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';
import { uploadVideo } from '@/services/video/upload';
import { pollMuxUntilReady } from '@/services/video/muxPoll';
import { emitMuxVideoReady } from '@/services/video/muxReadyEvents';
import { toUserFacingError } from '@/lib/errors';

export type CreateReelInput = {
  authorId: string;
  regionId: string;
  videoUri: string;
  caption?: string;
  music?: MusicSelection | null;
  editManifest?: PublishedEditManifest | null;
};

export type CreateReelProgress = 'picking' | 'compressing' | 'uploading' | 'processing' | 'publishing' | 'done';

export async function createReel(
  input: CreateReelInput,
  onProgress?: (stage: CreateReelProgress, message?: string) => void,
): Promise<{ reelId: string | null; error: string | null; processing?: boolean }> {
  const caption = input.caption?.trim() ?? '';

  try {
    onProgress?.('compressing', VIDEO_PROGRESS.preparing);

    const preparedUri = await prepareLocalVideoUri(input.videoUri);
    const fileSize = getLocalFileSize(preparedUri);
    const skipCompression =
      Boolean(input.editManifest) || shouldSkipVideoCompression(fileSize, 'fast');

    const video = await uploadVideo(
      {
        uri: preparedUri,
        ownerId: input.authorId,
        regionId: input.regionId,
        description: caption || undefined,
      },
      (state) => {
        if (state.stage === 'compressing') {
          onProgress?.('compressing', VIDEO_PROGRESS.compressing);
        } else if (state.stage === 'uploading') {
          onProgress?.('uploading', VIDEO_PROGRESS.uploading);
        }
      },
      { profile: 'fast', skipCompression },
    );

    onProgress?.('publishing', 'Reel yayınlanıyor...');

    const { reelId, error } = await publishPostAsReel({
      authorId: input.authorId,
      regionId: input.regionId,
      videoId: video.id,
      caption,
      music: input.music ?? null,
      editManifest: input.editManifest ?? null,
    });

    if (error) return { reelId: null, error };
    if (input.music && reelId) {
      await recordAudioUsage(input.music, { reelId });
    }

    onProgress?.('done', 'Reel paylaşıldı, video işleniyor...');

    void pollMuxUntilReady(video.id).then((result) => {
      if (result.status === 'ready') emitMuxVideoReady(video.id);
    });

    return { reelId, error: null, processing: true };
  } catch (err) {
    const message = toUserFacingError(err instanceof Error ? err.message : null, {
      fallback: 'Reel paylaşılamadı.',
    });
    return { reelId: null, error: message };
  }
}
