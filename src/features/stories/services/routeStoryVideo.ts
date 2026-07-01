import { router, type Href } from 'expo-router';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { stabilizeStoryVideoUri } from '@/features/stories/services/stabilizeStoryMedia';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';

/** Hikâye videosunu süreye göre kırpma ekranına veya doğrudan paylaşıma yönlendirir. */
export async function routeStoryVideo(uri: string, durationSec?: number): Promise<void> {
  const stableUri = await stabilizeStoryVideoUri(uri);

  let duration = durationSec;
  if (duration == null || duration <= 0) {
    duration = await probeVideoDuration(stableUri);
  }

  if (duration > STORY_MAX_VIDEO_SEC) {
    router.replace({
      pathname: '/vora-studio',
      params: { sourceUri: stableUri, mode: 'story' },
    } as Href);
    return;
  }

  useStoryPublishStore.getState().setDraft({
    mediaUri: stableUri,
    mediaType: 'video',
    durationSec: duration > 0 ? duration : undefined,
  });
  router.replace('/stories/publish' as Href);
}
