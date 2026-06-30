import { Camera } from 'expo-camera';
import { AudioModule, setIsAudioActiveAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import type { CallType } from '@/features/calls/types';

export type CallPermissionResult = {
  granted: boolean;
  message?: string;
};

/** Arama öncesi mikrofon, kamera (görüntülü) ve bildirim izinlerini iste. */
export async function ensureCallPermissions(callType: CallType): Promise<CallPermissionResult> {
  await setIsAudioActiveAsync(true);

  const mic = await AudioModule.requestRecordingPermissionsAsync();
  if (!mic.granted) {
    return {
      granted: false,
      message: 'Sesli görüşme için mikrofon izni gerekli. Ayarlardan izin verebilirsiniz.',
    };
  }

  if (callType === 'video') {
    const camera = await Camera.requestCameraPermissionsAsync();
    if (!camera.granted) {
      return {
        granted: false,
        message: 'Görüntülü arama için kamera izni gerekli. Ayarlardan izin verebilirsiniz.',
      };
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== 'granted') {
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  return { granted: true };
}
