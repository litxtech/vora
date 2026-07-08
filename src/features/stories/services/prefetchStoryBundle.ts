import { fetchStoryBundle } from '@/features/stories/services/fetchStoryBundle';
import { prefetchStoryItemMedia } from '@/features/stories/services/prefetchStoryMedia';
import { useStoryViewerStore } from '@/features/stories/store/storyViewerStore';

const inflightBundles = new Map<string, Promise<void>>();

/** Hikâye açılmadan önce bundle + ilk slayt medyasını ısıt. */
export function prefetchStoryBundle(viewerId: string | null, authorId: string): void {
  if (!authorId) return;
  if (useStoryViewerStore.getState().bundles[authorId]) return;
  if (inflightBundles.has(authorId)) return;

  const task = fetchStoryBundle(viewerId, authorId)
    .then((data) => {
      if (!data?.items.length) return;
      useStoryViewerStore.getState().setBundle(authorId, data);
      const first = data.items[0];
      if (first) prefetchStoryItemMedia(first);
    })
    .catch(() => {})
    .finally(() => {
      inflightBundles.delete(authorId);
    });

  inflightBundles.set(authorId, task);
}
