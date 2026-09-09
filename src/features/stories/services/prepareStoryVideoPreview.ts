import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { isPlayableVideoUrl } from '@/lib/media/videoSource';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';

/**
 * Kamera / galeri videosunu expo-video ile oynatılabilir bağımsız file:// yoluna çevirir.
 * forceCopy: kamera oturumu aynı temp dosyayı kilitlediğinde siyah ekranı önler.
 */
export async function prepareStoryVideoPreviewUri(uri: string): Promise<string> {
  const normalized = normalizeLocalFileUri(uri);
  const prepared = await prepareLocalVideoUri(normalized, { forceCopy: true });
  const playable = normalizeLocalFileUri(prepared);
  if (!isPlayableVideoUrl(playable)) {
    throw new Error('Video önizlemesi hazırlanamadı.');
  }
  return playable;
}
