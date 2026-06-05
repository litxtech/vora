import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import type { NotificationSoundSetting } from '@/lib/notifications/types';
import { ensureAndroidChannels } from '@/lib/notifications/channels';

const SOUND_DIR = `${FileSystem.documentDirectory}notification-sounds/`;

export async function ensureSoundDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SOUND_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SOUND_DIR, { intermediates: true });
  }
}

export async function getAudioDurationSeconds(uri: string): Promise<number> {
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return 0;
    return (status.durationMillis ?? 0) / 1000;
  } finally {
    await sound.unloadAsync();
  }
}

export function validateSoundDuration(seconds: number): boolean {
  return seconds > 0 && seconds <= MAX_NOTIFICATION_SOUND_SECONDS;
}

export async function syncNotificationSounds(
  settings: NotificationSoundSetting[],
): Promise<NotificationSoundSetting[]> {
  await ensureSoundDirectory();

  const synced: NotificationSoundSetting[] = [];

  for (const setting of settings) {
    if (!setting.isCustomEnabled || !setting.soundUrl || !setting.soundFilename) {
      synced.push(setting);
      continue;
    }

    const localPath = `${SOUND_DIR}${setting.soundFilename}`;
    const info = await FileSystem.getInfoAsync(localPath);

    if (!info.exists) {
      try {
        await FileSystem.downloadAsync(setting.soundUrl, localPath);
      } catch {
        synced.push({ ...setting, isCustomEnabled: false });
        continue;
      }
    }

    synced.push({
      ...setting,
      soundUrl: Platform.OS === 'android' ? localPath : setting.soundUrl,
    });
  }

  await ensureAndroidChannels(synced);
  return synced;
}
