import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { toUserFacingError } from '@/lib/errors';
import { openUrl } from '@/lib/linking/openUrl';

type ExportInput = {
  workId: string;
  title: string;
  audioUrl: string;
};

type CachedAudio = {
  uri: string;
  filename: string;
  mimeType: string;
  uti: string;
};

function fileStem(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || 'Vora-muzik';
}

function isShareCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel|dismiss|did not share|user did not|abort/i.test(message);
}

async function cacheAiMusicFile(
  input: ExportInput,
): Promise<{ file: CachedAudio | null; error: string | null }> {
  const filename = `${fileStem(input.title)}.mp3`;
  const root = FileSystem.cacheDirectory;
  if (!root) {
    return { file: null, error: 'Dosya bu cihazda kaydedilemedi.' };
  }

  const dir = `${root}ai-music/${input.workId}`;
  const dest = `${dir}/${filename}`;

  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Klasör daha önce açıldıysa indirmeye devam edilir.
  }

  try {
    const existing = await FileSystem.getInfoAsync(dest);
    if (!existing.exists || existing.size <= 0) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      const result = await FileSystem.downloadAsync(input.audioUrl, dest);
      if (result.status !== 200) {
        return { file: null, error: 'Müzik indirilemedi.' };
      }
    }
    return {
      file: { uri: dest, filename, mimeType: 'audio/mpeg', uti: 'public.mp3' },
      error: null,
    };
  } catch (error) {
    return {
      file: null,
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'Müzik indirilemedi.',
      }),
    };
  }
}

async function shareLocalFile(file: CachedAudio, dialogTitle: string): Promise<string | null> {
  try {
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) {
      return 'Paylaşım bu cihazda açılamadı.';
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      UTI: file.uti,
      dialogTitle,
    });
    return null;
  } catch (error) {
    if (isShareCancel(error)) return null;
    return toUserFacingError(error instanceof Error ? error.message : null, {
      fallback: 'Paylaşım açılamadı.',
    });
  }
}

export async function saveAiMusicToPhone(
  input: ExportInput,
): Promise<{ error: string | null; saved: 'library' | 'sheet' | 'web' | null }> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') {
      return { error: 'İndirme bu ortamda açılamadı.', saved: null };
    }
    const anchor = document.createElement('a');
    anchor.href = input.audioUrl;
    anchor.download = `${fileStem(input.title)}.mp3`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { error: null, saved: 'web' };
  }

  const cached = await cacheAiMusicFile(input);
  if (!cached.file) return { error: cached.error, saved: null };

  if (Platform.OS === 'android') {
    try {
      let permission: MediaLibrary.PermissionResponse;
      try {
        permission = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
      } catch {
        permission = await MediaLibrary.requestPermissionsAsync();
      }
      if (!permission.granted) {
        return { error: 'Müziği kaydetmek için depolama izni vermelisin.', saved: null };
      }
      await MediaLibrary.createAssetAsync(cached.file.uri);
      return { error: null, saved: 'library' };
    } catch {
      const sheetError = await shareLocalFile(cached.file, 'Telefona kaydet');
      return { error: sheetError, saved: sheetError ? null : 'sheet' };
    }
  }

  const sheetError = await shareLocalFile(cached.file, 'Telefona kaydet');
  return { error: sheetError, saved: sheetError ? null : 'sheet' };
}

export async function shareAiMusicOnWhatsApp(input: ExportInput): Promise<{ error: string | null }> {
  if (Platform.OS === 'web') {
    const text = `${input.title}\n${input.audioUrl}`;
    try {
      await openUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
      return { error: null };
    } catch (error) {
      return {
        error: toUserFacingError(error instanceof Error ? error.message : null, {
          fallback: 'WhatsApp açılamadı.',
        }),
      };
    }
  }

  const cached = await cacheAiMusicFile(input);
  if (!cached.file) return { error: cached.error };
  return { error: await shareLocalFile(cached.file, 'WhatsApp ile paylaş') };
}
