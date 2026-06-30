import { deferUntilUiIdle } from '@/lib/ui/deferUntilUiIdle';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Navigasyon sonrası bir sonraki frame'in çizilmesini bekler — overlay kalkmadan önce feed görünür olsun. */
export async function waitForBootPaint(timeoutMs: number): Promise<void> {
  await Promise.race([
    new Promise<void>((resolve) => {
      deferUntilUiIdle(resolve);
    }),
    sleep(Math.min(timeoutMs, 80)),
  ]);
}
