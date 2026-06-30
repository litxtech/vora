import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import type { NotificationSoundSetting } from '@/lib/notifications/types';
import { ensureAndroidChannels } from '@/lib/notifications/channels';
import { syncAllNotificationSounds } from '@/lib/notifications/soundCache';

async function loadExpoAudio() {
  return import('expo-audio');
}

export async function getAudioDurationSeconds(uri: string): Promise<number> {
  const { createAudioPlayer } = await loadExpoAudio();
  const player = createAudioPlayer(uri);
  try {
    if (player.duration > 0) return player.duration;

    return await new Promise<number>((resolve) => {
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.duration > 0) {
          subscription.remove();
          resolve(status.duration);
        }
      });
    });
  } finally {
    player.release();
  }
}

export function validateSoundDuration(seconds: number): boolean {
  return seconds > 0 && seconds <= MAX_NOTIFICATION_SOUND_SECONDS;
}

export async function syncNotificationSounds(
  settings: NotificationSoundSetting[],
): Promise<void> {
  await syncAllNotificationSounds(settings);
  await ensureAndroidChannels();
}
