import { pollMuxUntilReady } from '@/services/video/muxPoll';

export async function waitForVideoReady(
  videoId: string,
  onStage?: (message: string) => void,
): Promise<void> {
  const result = await pollMuxUntilReady(videoId, {
    maxWaitMs: 120_000,
    onPoll: () => onStage?.('Video işleniyor, lütfen bekleyin...'),
  });

  if (result.status === 'ready') return;

  if (result.status === 'error') {
    throw new Error('Video işlenemedi. Lütfen farklı bir dosya deneyin.');
  }

  throw new Error(
    'Video işleme sürdü. Yayınlandığında Reels sekmesinde görünecek; birkaç dakika sonra kontrol edin.',
  );
}
