import * as FileSystem from 'expo-file-system/legacy';
import type { NotificationSoundSetting } from '@/lib/notifications/types';
import type { NotificationEventType } from '@/constants/notifications';
import { parseSoundExtension } from '@/lib/notifications/soundConstants';

export const SOUND_DIR = `${FileSystem.documentDirectory}notification-sounds/`;

/** Özellik → yerel ses dosyası yolu */
let localSoundMap = new Map<NotificationEventType, string>();

export function getLocalSoundPath(eventType: NotificationEventType): string | null {
  return localSoundMap.get(eventType) ?? null;
}

export function getLocalSoundMap(): ReadonlyMap<NotificationEventType, string> {
  return localSoundMap;
}

export async function ensureSoundDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SOUND_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SOUND_DIR, { intermediates: true });
  }
}

type SoundManifest = Partial<Record<NotificationEventType, { url: string; ext: string }>>;

const MANIFEST_PATH = `${SOUND_DIR}manifest.json`;

async function readManifest(): Promise<SoundManifest> {
  try {
    const info = await FileSystem.getInfoAsync(MANIFEST_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
    return JSON.parse(raw) as SoundManifest;
  } catch {
    return {};
  }
}

async function writeManifest(manifest: SoundManifest): Promise<void> {
  await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(manifest));
}

async function removeEventSoundFiles(eventType: NotificationEventType): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(SOUND_DIR);
    await Promise.all(
      files
        .filter((name) => name.startsWith(`${eventType}.`))
        .map((name) => FileSystem.deleteAsync(`${SOUND_DIR}${name}`, { idempotent: true })),
    );
  } catch {
    // manifest veya dizin henüz yok
  }
}

export async function syncAllNotificationSounds(
  settings: NotificationSoundSetting[],
): Promise<Map<NotificationEventType, string>> {
  await ensureSoundDirectory();
  const map = new Map<NotificationEventType, string>();
  const manifest = await readManifest();
  const nextManifest: SoundManifest = { ...manifest };

  for (const setting of settings) {
    if (!setting.isCustomEnabled || !setting.soundUrl || !setting.soundFilename) {
      delete nextManifest[setting.eventType];
      await removeEventSoundFiles(setting.eventType);
      continue;
    }

    const ext = parseSoundExtension(setting.soundFilename);
    if (!ext) continue;

    const localPath = `${SOUND_DIR}${setting.eventType}.${ext}`;
    const cached = manifest[setting.eventType];
    const needsDownload =
      !cached || cached.url !== setting.soundUrl || cached.ext !== ext;

    try {
      if (needsDownload) {
        await removeEventSoundFiles(setting.eventType);
        await FileSystem.downloadAsync(setting.soundUrl, localPath);
        nextManifest[setting.eventType] = { url: setting.soundUrl, ext };
      } else {
        const localInfo = await FileSystem.getInfoAsync(localPath);
        if (!localInfo.exists) {
          await FileSystem.downloadAsync(setting.soundUrl, localPath);
        }
      }

      map.set(setting.eventType, localPath);
    } catch {
      delete nextManifest[setting.eventType];
    }
  }

  await writeManifest(nextManifest);
  localSoundMap = map;
  return map;
}
