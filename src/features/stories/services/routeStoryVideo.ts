import { router, type Href } from 'expo-router';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { prepareStoryVideoPreviewUri } from '@/features/stories/services/prepareStoryVideoPreview';
import { stabilizeStoryVideoUri } from '@/features/stories/services/stabilizeStoryMedia';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';

/** ImagePicker ms, kamera/probe sn döndürür. */
export function normalizeIncomingDurationSec(raw?: number): number | undefined {
  if (raw == null || raw <= 0) return undefined;
  if (raw > 90) return raw / 1000;
  return raw;
}

/**
 * Hikâye videosunu paylaşım ekranına veya kırpma stüdyosuna yönlendirir.
 * Önizleme için önce oynatılabilir file:// yolu hazırlanır (siyah ekran önlenir).
 */
export async function routeStoryVideo(uri: string, durationSec?: number): Promise<void> {
  const previewUri = await prepareStoryVideoPreviewUri(uri);

  let duration = normalizeIncomingDurationSec(durationSec);
  if (duration == null || duration <= 0) {
    try {
      duration = await probeVideoDuration(previewUri);
    } catch {
      duration = 0;
    }
  }

  if (duration > STORY_MAX_VIDEO_SEC) {
    const stableUri = await stabilizeStoryVideoUri(previewUri);
    router.replace({
      pathname: '/vora-studio',
      params: { sourceUri: stableUri, mode: 'story' },
    } as Href);
    return;
  }

  useStoryPublishStore.getState().setDraft({
    mediaUri: previewUri,
    mediaType: 'video',
    durationSec: duration > 0 ? duration : undefined,
  });
  router.replace('/stories/publish' as Href);
}
