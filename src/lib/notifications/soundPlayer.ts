import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { NotificationEventType } from '@/constants/notifications';
import { safeSetAudioModeAsync } from '@/lib/audio/safeAudioMode';
import { getLocalSoundPath } from '@/lib/notifications/soundCache';

type AudioPlayer = {
  play: () => void;
  release: () => void;
  addListener: (
    event: 'playbackStatusUpdate',
    cb: (status: { didJustFinish?: boolean; isLoaded?: boolean; duration?: number }) => void,
  ) => { remove: () => void };
};

const DEFAULT_NOTIFICATION_SOUND = require('../../../assets/sounds/vora_default.wav');

let currentSound: AudioPlayer | null = null;
let audioModeConfigured = false;
const recentSoundKeys = new Map<string, number>();
const SOUND_DEDUPE_MS = 15_000;

async function loadExpoAudio() {
  return import('expo-audio');
}

async function configureNotificationAudioMode(): Promise<void> {
  if (audioModeConfigured) return;

  const ok = await safeSetAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
  });
  if (ok) {
    audioModeConfigured = true;
  }
}

function pruneRecentSoundKeys(now: number): void {
  for (const [key, timestamp] of recentSoundKeys) {
    if (now - timestamp > SOUND_DEDUPE_MS) {
      recentSoundKeys.delete(key);
    }
  }
}

export function shouldPlayNotificationSound(notificationKey?: string | null): boolean {
  if (!notificationKey) return true;

  const now = Date.now();
  pruneRecentSoundKeys(now);

  if (recentSoundKeys.has(notificationKey)) {
    return false;
  }

  recentSoundKeys.set(notificationKey, now);
  return true;
}

async function playBundledSound(source: number | string): Promise<boolean> {
  try {
    const { createAudioPlayer } = await loadExpoAudio();

    if (currentSound) {
      currentSound.release();
      currentSound = null;
    }

    await configureNotificationAudioMode();

    const player = createAudioPlayer(source);
    currentSound = player;

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.release();
        if (currentSound === player) currentSound = null;
      }
    });

    player.play();
    return true;
  } catch {
    return false;
  }
}

export async function playDefaultNotificationSound(): Promise<boolean> {
  return playBundledSound(DEFAULT_NOTIFICATION_SOUND);
}

export async function playCustomNotificationSound(
  eventType: NotificationEventType | string,
): Promise<boolean> {
  const localPath = getLocalSoundPath(eventType as NotificationEventType);
  if (!localPath) return false;

  return playBundledSound(localPath);
}

export async function playForegroundNotificationAlert(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics desteklenmiyorsa yoksay
  }

  if (Platform.OS === 'ios') {
    await playDefaultNotificationSound();
  }
}

export async function playForegroundNotificationSound(
  eventType: NotificationEventType | string | undefined,
  useCustom: boolean,
): Promise<void> {
  if (!useCustom || !eventType) return;

  await playCustomNotificationSound(eventType);
}

export async function prepareNotificationAudioMode(): Promise<void> {
  await configureNotificationAudioMode();
}
