import { create } from 'zustand';
import { publishStory, type PublishStoryInput } from '@/features/stories/services/publishStory';
import { prefetchStoryRings } from '@/features/stories/services/storyRingSession';
import { isUploadCancelledError } from '@/services/video/uploadCancelled';
import { supabase } from '@/lib/supabase/client';

export type StoryUploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';

export type StoryUploadStage = 'preparing' | 'compressing' | 'uploading' | 'thumbnail' | 'publishing' | 'done';

type StoryUploadState = {
  status: StoryUploadStatus;
  stage: StoryUploadStage;
  progress: number;
  message: string;
  previewUri: string | null;
  mediaType: 'image' | 'video' | null;
  videoUploadActive: boolean;
  bannerHidden: boolean;
  error: string | null;
  storyId: string | null;
  itemId: string | null;
  publishSnapshot: PublishStoryInput | null;
  abortController: AbortController | null;
  startPublish: (input: PublishStoryInput, previewUri?: string | null) => void;
  cancelUpload: () => void;
  hideBanner: () => void;
  showBanner: () => void;
  dismiss: () => void;
};

let publishRunId = 0;

async function removeStoryItemIfNeeded(itemId: string | null): Promise<void> {
  if (!itemId) return;
  await supabase.from('story_items').update({ status: 'removed' }).eq('id', itemId);
}

async function refreshStoryRings(authorId: string): Promise<void> {
  await prefetchStoryRings(authorId, { background: true, animate: true, force: true });
}

export const useStoryUploadStore = create<StoryUploadState>((set, get) => ({
  status: 'idle',
  stage: 'preparing',
  progress: 0,
  message: '',
  previewUri: null,
  mediaType: null,
  videoUploadActive: false,
  bannerHidden: false,
  error: null,
  storyId: null,
  itemId: null,
  publishSnapshot: null,
  abortController: null,

  startPublish: (input, previewUri) => {
    const current = get();
    if (current.status === 'uploading' || (current.status === 'success' && current.videoUploadActive)) {
      return;
    }

    const runId = ++publishRunId;
    const controller = new AbortController();
    const isVideo = input.mediaType === 'video';

    set({
      status: 'uploading',
      stage: 'preparing',
      progress: 0.04,
      message: isVideo ? 'Hikâye hazırlanıyor…' : 'Görsel yükleniyor…',
      previewUri: previewUri ?? input.localUri,
      mediaType: input.mediaType,
      videoUploadActive: isVideo,
      bannerHidden: false,
      error: null,
      storyId: null,
      itemId: null,
      publishSnapshot: input,
      abortController: controller,
    });

    void (async () => {
      try {
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
              const mappedStage: StoryUploadStage =
                progress.stage === 'saving'
                  ? 'publishing'
                  : progress.stage === 'thumbnail'
                    ? 'thumbnail'
                    : progress.stage;
              set({
                stage: mappedStage,
                message: progress.message,
                progress: mappedProgress,
              });
            },
          },
          {
            signal: controller.signal,
            onPublished: ({ storyId, itemId, videoProcessing }) => {
              if (runId !== publishRunId) return;
              set({
                storyId,
                itemId,
                status: 'success',
                stage: videoProcessing ? 'uploading' : 'done',
                progress: videoProcessing ? 0.38 : 1,
                message: videoProcessing ? 'Video arka planda yükleniyor…' : 'Hikâyen yayında',
                videoUploadActive: videoProcessing,
              });
              void refreshStoryRings(input.authorId);
            },
            onBackgroundComplete: ({ error, cancelled }) => {
              if (runId !== publishRunId) return;
              if (cancelled) {
                set({
                  status: 'cancelled',
                  message: 'Yükleme iptal edildi.',
                  videoUploadActive: false,
                  abortController: null,
                });
                void refreshStoryRings(input.authorId);
                return;
              }
              if (error) {
                set({
                  status: 'error',
                  error,
                  message: error,
                  videoUploadActive: false,
                  abortController: null,
                });
                return;
              }
              set({
                status: 'success',
                stage: 'done',
                progress: 1,
                message: 'Hikâyen yayında',
                videoUploadActive: false,
                abortController: null,
              });
            },
          },
        );

        if (runId !== publishRunId) return;

        if (result.cancelled) {
          set({
            status: 'cancelled',
            message: 'Yükleme iptal edildi.',
            videoUploadActive: false,
            abortController: null,
          });
          return;
        }

        if (result.error) {
          set({
            status: 'error',
            error: result.error,
            message: result.error,
            videoUploadActive: false,
            abortController: null,
          });
          return;
        }

        if (!result.videoProcessing) {
          set({
            status: 'success',
            stage: 'done',
            progress: 1,
            message: 'Hikâyen yayında',
            videoUploadActive: false,
            abortController: null,
          });
        }
      } catch (err) {
        if (runId !== publishRunId) return;
        if (isUploadCancelledError(err)) {
          const { itemId } = get();
          await removeStoryItemIfNeeded(itemId);
          void refreshStoryRings(input.authorId);
          set({
            status: 'cancelled',
            message: 'Yükleme iptal edildi.',
            videoUploadActive: false,
            abortController: null,
          });
          return;
        }
        const message = err instanceof Error ? err.message : 'Paylaşım başarısız.';
        set({
          status: 'error',
          error: message,
          message,
          videoUploadActive: false,
          abortController: null,
        });
      }
    })();
  },

  cancelUpload: () => {
    const { abortController, status, videoUploadActive, itemId, publishSnapshot } = get();
    if (status !== 'uploading' && !(status === 'success' && videoUploadActive)) return;
    publishRunId += 1;
    abortController?.abort();
    void removeStoryItemIfNeeded(itemId);
    if (publishSnapshot?.authorId) {
      void refreshStoryRings(publishSnapshot.authorId);
    }
    set({
      status: 'cancelled',
      message: 'Yükleme iptal edildi.',
      videoUploadActive: false,
      abortController: null,
    });
  },

  hideBanner: () => {
    set({ bannerHidden: true });
  },

  showBanner: () => {
    set({ bannerHidden: false });
  },

  dismiss: () => {
    publishRunId += 1;
    get().abortController?.abort();
    set({
      status: 'idle',
      stage: 'preparing',
      progress: 0,
      message: '',
      previewUri: null,
      mediaType: null,
      videoUploadActive: false,
      bannerHidden: false,
      error: null,
      storyId: null,
      itemId: null,
      publishSnapshot: null,
      abortController: null,
    });
  },
}));
