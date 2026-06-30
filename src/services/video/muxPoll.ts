import { syncMuxVideo, type MuxSyncResult } from '@/lib/mux/client';

const MAX_WAIT_MS = 300_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Upload sonrası Mux tarafında asset oluşumunu hemen tetikler. */
export function kickstartMuxSync(videoId: string): void {
  void syncMuxVideo(videoId).catch(() => undefined);
}

function pollDelayMs(elapsedMs: number): number {
  if (elapsedMs < 20_000) return 800;
  if (elapsedMs < 60_000) return 1500;
  return 3000;
}

export async function pollMuxUntilReady(
  videoId: string,
  options?: { maxWaitMs?: number; onPoll?: () => void },
): Promise<MuxSyncResult> {
  const maxWait = options?.maxWaitMs ?? MAX_WAIT_MS;
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    options?.onPoll?.();
    const result = await syncMuxVideo(videoId);

    if (result.status === 'ready' || result.status === 'error') {
      return result;
    }

    await sleep(pollDelayMs(Date.now() - started));
  }

  return { status: 'processing' };
}
