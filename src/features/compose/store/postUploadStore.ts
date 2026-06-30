import { create } from 'zustand';
import { createPost, type CreatePostInput } from '@/features/compose/services/createPost';
import { isUploadCancelledError } from '@/services/video/uploadCancelled';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';

export type PostUploadStage =
  | 'preparing'
  | 'compressing'
  | 'uploading'
  | 'saving'
  | 'published'
  | 'attestation'
  | 'reel'
  | 'done';

export type PostUploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';

export type PostUploadResult = {
  postId: string | null;
  reelId: string | null;
  pendingReview?: boolean;
  videoProcessing?: boolean;
  communityId?: string | null;
};

type PostUploadState = {
  status: PostUploadStatus;
  progress: number;
  stage: PostUploadStage;
  message: string;
  etaSec: number | null;
  previewUri: string | null;
  error: string | null;
  result: PostUploadResult | null;
  composeSnapshot: CreatePostInput | null;
  abortController: AbortController | null;
  videoUploadActive: boolean;
  startUpload: (input: CreatePostInput, previewUri?: string | null) => void;
  cancelUpload: () => void;
  dismiss: () => void;
};

let uploadRunId = 0;

export const usePostUploadStore = create<PostUploadState>((set, get) => ({
  status: 'idle',
  progress: 0,
  stage: 'preparing',
  message: '',
  etaSec: null,
  previewUri: null,
  error: null,
  result: null,
  composeSnapshot: null,
  abortController: null,
  videoUploadActive: false,

  startUpload: (input, previewUri) => {
    const current = get();
    if (current.status === 'uploading') return;

    const runId = ++uploadRunId;
    const controller = new AbortController();
    const thumb =
      previewUri ??
      input.mediaUris.find((uri) => !isLocalVideoUri(uri)) ??
      input.mediaUris[0] ??
      null;
    const hasVideo = input.mediaUris.some((uri) => isLocalVideoUri(uri));

    set({
      status: 'uploading',
      progress: 0,
      stage: 'preparing',
      message: VIDEO_PROGRESS.preparing,
      etaSec: null,
      previewUri: thumb,
      error: null,
      result: null,
      composeSnapshot: input,
      abortController: controller,
      videoUploadActive: hasVideo,
    });

    void (async () => {
      try {
        const outcome = await createPost(
          input,
          (stage, progress, message, etaSec) => {
            if (runId !== uploadRunId) return;
            set((state) => ({
              stage: stage as PostUploadStage,
              progress,
              message: message ?? '',
              etaSec: etaSec ?? null,
              videoUploadActive:
                state.videoUploadActive && stage !== 'done' && stage !== 'attestation'
                  ? progress < 0.98
                  : state.videoUploadActive,
            }));
          },
          {
            signal: controller.signal,
            onPublished: ({ postId, videoProcessing }) => {
              if (runId !== uploadRunId) return;
              useFeedStore.getState().incrementNewPosts();
              set({
                status: 'success',
                stage: 'published',
                progress: 0.78,
                message: videoProcessing ? 'Gönderi paylaşıldı, video yükleniyor...' : 'Paylaşıldı',
                result: {
                  postId,
                  reelId: null,
                  pendingReview: false,
                  videoProcessing,
                  communityId: input.communityId ?? null,
                },
              });
            },
          },
        );

        if (runId !== uploadRunId) return;

        if (outcome.cancelled) {
          set({
            status: 'cancelled',
            abortController: null,
            videoUploadActive: false,
            message: 'Yükleme iptal edildi.',
          });
          return;
        }

        if (outcome.error) {
          set({
            status: 'error',
            error: outcome.error,
            abortController: null,
            videoUploadActive: false,
            message: outcome.error,
          });
          return;
        }

        set({
          status: 'success',
          progress: 1,
          stage: 'done',
          message: 'Paylaşıldı',
          etaSec: null,
          abortController: null,
          videoUploadActive: false,
          result: {
            postId: outcome.postId,
            reelId: outcome.reelId,
            pendingReview: outcome.pendingReview,
            videoProcessing: outcome.videoProcessing,
            communityId: input.communityId ?? null,
          },
        });
      } catch (err) {
        if (runId !== uploadRunId) return;
        if (isUploadCancelledError(err)) {
          set({
            status: 'cancelled',
            abortController: null,
            videoUploadActive: false,
            message: 'Yükleme iptal edildi.',
          });
          return;
        }
        const message = err instanceof Error ? err.message : 'Paylaşım başarısız.';
        set({
          status: 'error',
          error: message,
          abortController: null,
          videoUploadActive: false,
          message,
        });
      }
    })();
  },

  cancelUpload: () => {
    const { abortController, status } = get();
    if (status !== 'uploading' && !(status === 'success' && get().videoUploadActive)) return;
    if (!abortController) return;
    abortController.abort();
    uploadRunId += 1;
    set({
      status: 'cancelled',
      abortController: null,
      videoUploadActive: false,
      message: 'Yükleme iptal edildi.',
    });
  },

  dismiss: () => {
    uploadRunId += 1;
    get().abortController?.abort();
    set({
      status: 'idle',
      progress: 0,
      stage: 'preparing',
      message: '',
      etaSec: null,
      previewUri: null,
      error: null,
      result: null,
      composeSnapshot: null,
      abortController: null,
      videoUploadActive: false,
    });
  },
}));
