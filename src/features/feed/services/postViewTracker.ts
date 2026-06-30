import { recordPostView } from '@/features/feed/services/feedData';

const pending = new Set<string>();
const recorded = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_MS = 2_500;
const MAX_BATCH = 8;

function flushPostViews(): void {
  flushTimer = null;
  const batch = [...pending].slice(0, MAX_BATCH);
  for (const id of batch) {
    pending.delete(id);
    recorded.add(id);
    void recordPostView(id);
  }
  if (pending.size > 0) {
    flushTimer = setTimeout(flushPostViews, FLUSH_MS);
  }
}

/** Görüntülenme kaydını toplu ve gecikmeli gönder — scroll sırasında ağ yükünü azaltır. */
export function schedulePostView(postId: string): void {
  if (!postId || postId.startsWith('demo-') || recorded.has(postId) || pending.has(postId)) {
    return;
  }
  pending.add(postId);
  if (!flushTimer) {
    flushTimer = setTimeout(flushPostViews, FLUSH_MS);
  }
}
