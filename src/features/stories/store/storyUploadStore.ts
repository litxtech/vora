import { create } from 'zustand';
import { publishStory, type PublishStoryInput } from '@/features/stories/services/publishStory';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';

export type StoryUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type StoryUploadState = {
  status: StoryUploadStatus;
  progress: number;
  message: string;
  previewUri: string | null;
  mediaType: 'image' | 'video' | null;
  videoUploadActive: boolean;
  error: string | null;
  startPublish: (input: PublishStoryInput, previewUri?: string | null) => void;
  dismiss: () => void;
};

let publishRunId = 0;

export const useStoryUploadStore = create<StoryUploadState>((set, get) => ({
  status: 'idle',
  progress: 0,
  message: '',
  previewUri: null,
  mediaType: null,
  videoUploadActive: false,
  error: null,

  startPublish: (input, previewUri) => {
    const current = get();
    if (current.status === 'uploading' || (current.status === 'success' && current.videoUploadActive)) {
      return;
    }

    const runId = ++publishRunId;
    const isVideo = input.mediaType === 'video';

    set({
      status: 'uploading',
      progress: 0.04,
      message: isVideo ? 'Hikâye hazırlanıyor…' : 'Görsel yükleniyor…',
      previewUri: previewUri ?? input.localUri,
      mediaType: input.mediaType,
      videoUploadActive: isVideo,
      error: null,
    });

    void (async () => {
      const result = await publishStory(
        {
          ...input,
          onUploadProgress: (progress) => {
            if (runId !== publishRunId) return;
            const stageBase =
              progress.stage === 'compressing'
                ? 0.1
                : progress.stage === 'uploading'
                  ? 0.22
                  : progress.stage === 'thumbnail'
                    ? 0.9
                    : 0.04;
            const stageSpan =
              progress.stage === 'compressing'
                ? 0.12
                : progress.stage === 'uploading'
                  ? 0.64
                  : progress.stage === 'thumbnail'
                    ? 0.08
                    : 0.06;
            const mappedProgress =
              stageBase + stageSpan * Math.min(Math.max(progress.progress ?? 0, 0), 1);
            set({
              message: progress.message,
              progress: mappedProgress,
            });
          },
        },
        {
          onPublished: ({ storyId, videoProcessing }) => {
            if (runId !== publishRunId) return;
            void fetchStoryRings({ viewerId: input.authorId }).then((refreshed) => {
              useStoryRingStore.getState().setRings(refreshed.rings);
            });
            set({
              status: 'success',
              progress: videoProcessing ? 0.38 : 1,
              message: videoProcessing ? 'Video arka planda yükleniyor…' : 'Hikâyen yayında',
              videoUploadActive: videoProcessing,
            });
            void storyId;
          },
          onBackgroundComplete: ({ error }) => {
            if (runId !== publishRunId) return;
            if (error) {
              set({
                status: 'error',
                error,
                message: error,
                videoUploadActive: false,
              });
              return;
            }
            set({
              status: 'success',
              progress: 1,
              message: 'Hikâyen yayında',
              videoUploadActive: false,
            });
          },
        },
      );

      if (runId !== publishRunId) return;

      if (result.error) {
        set({
          status: 'error',
          error: result.error,
          message: result.error,
          videoUploadActive: false,
        });
        return;
      }

      if (!result.videoProcessing) {
        set({
          status: 'success',
          progress: 1,
          message: 'Hikâyen yayında',
          videoUploadActive: false,
        });
      }
    })();
  },

  dismiss: () => {
    publishRunId += 1;
    set({
      status: 'idle',
      progress: 0,
      message: '',
      previewUri: null,
      mediaType: null,
      videoUploadActive: false,
      error: null,
    });
  },
}));
