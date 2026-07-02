import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer } from 'expo-audio';
import {
  MIN_SOUND_DURATION_SEC,
  SOUND_ACCEPTED_AUDIO_MIME,
} from '@/features/sounds/constants';

export type SoundImportResult =
  | { ok: true; uri: string; durationSec: number; label: string }
  | { ok: false; error: string };

async function probeAudioDurationSec(uri: string): Promise<number> {
  const player = createAudioPlayer({ uri });
  try {
    if (player.duration > 0) return player.duration;

    return await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Ses süresi okunamadı'));
      }, 12_000);

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.duration > 0) {
          clearTimeout(timeout);
          subscription.remove();
          resolve(status.duration);
        }
      });
    });
  } finally {
    player.release();
  }
}

function validateDuration(durationSec: number): string | null {
  if (durationSec < MIN_SOUND_DURATION_SEC) {
    return `Ses en az ${MIN_SOUND_DURATION_SEC} saniye olmalı.`;
  }
  return null;
}

async function finalizeImportUri(
  uri: string,
  label: string,
): Promise<SoundImportResult> {
  try {
    const durationSec = Math.ceil(await probeAudioDurationSec(uri));
    const durationError = validateDuration(durationSec);
    if (durationError) {
      return { ok: false, error: durationError };
    }
    return { ok: true, uri, durationSec, label };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ses hazırlanamadı' };
  }
}

export async function pickSoundFromFiles(): Promise<SoundImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...SOUND_ACCEPTED_AUDIO_MIME, 'audio/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, error: 'cancelled' };
  }

  const asset = result.assets[0];
  const rawUri = asset.uri;
  const label = asset.name ?? 'Ses dosyası';

  try {
    const durationSec = Math.ceil(await probeAudioDurationSec(rawUri));
    const durationError = validateDuration(durationSec);
    if (durationError) return { ok: false, error: durationError };

    return finalizeImportUri(rawUri, label);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Dosya okunamadı' };
  }
}

export async function pickSoundFromGalleryVideo(): Promise<SoundImportResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: 'Galeri izni gerekli. Ayarlardan izin verin.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, error: 'cancelled' };
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const label = asset.fileName ?? 'Galeri videosu';

  try {
    const fromAssetMs = asset.duration ?? 0;
    const durationSec =
      fromAssetMs > 0 ? Math.ceil(fromAssetMs / 1000) : Math.ceil(await probeAudioDurationSec(uri));

    const durationError = validateDuration(durationSec);
    if (durationError) {
      return { ok: false, error: durationError };
    }

    return finalizeImportUri(uri, label);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Videodan ses okunamadı',
    };
  }
}
