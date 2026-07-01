import { documentDirectory } from 'expo-file-system/legacy';
import { getLocalFileSize, normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { persistVideoForQueue } from '@/lib/video/prepareLocalVideo';

/** Kamera / galeri URI'sini hikâye yayını için kalıcı file:// yoluna çevirir. */
export async function stabilizeStoryVideoUri(uri: string): Promise<string> {
  const normalized = normalizeLocalFileUri(uri);

  if (documentDirectory && normalized.includes(documentDirectory)) {
    if (getLocalFileSize(normalized) > 0) return normalized;
  }

  const persisted = await persistVideoForQueue(uri);
  if (getLocalFileSize(persisted) <= 0) {
    throw new Error('Video dosyası okunamadı. Lütfen tekrar çekin.');
  }

  return persisted;
}
