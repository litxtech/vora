import { cacheDirectory, copyAsync, documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { getRealPath } from 'react-native-compressor';

function extFromUri(uri: string): string {
  const match = uri.match(/\.(mp4|mov|m4v)(\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : '.mp4';
}

type PrepareLocalVideoOptions = {
  /**
   * Kamera temp dosyası / oturum kilidi: aynı file:// yolu VideoView'da siyah ekran verir.
   * Önizleme için her zaman bağımsız cache kopyası oluştur.
   */
  forceCopy?: boolean;
};

/** Image picker / galeri / kamera URI'sini okunabilir file:// yoluna çevirir. */
export async function prepareLocalVideoUri(
  uri: string,
  options?: PrepareLocalVideoOptions,
): Promise<string> {
  if (!uri) throw new Error('Video dosyası bulunamadı.');

  if (uri.startsWith('file://') && !options?.forceCopy) {
    const info = await getInfoAsync(uri);
    if (info.exists) return uri;
  }

  if (
    !options?.forceCopy &&
    (uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('assets-library://'))
  ) {
    try {
      const resolved = await getRealPath(uri, 'video');
      const normalized = resolved.startsWith('file://') ? resolved : `file://${resolved}`;
      const info = await getInfoAsync(normalized);
      if (info.exists) return normalized;
    } catch {
      // Tam kopya yedek yol
    }
  }

  const dest = `${cacheDirectory}vora-video-${Date.now()}${extFromUri(uri)}`;
  await copyAsync({ from: uri, to: dest });

  const copied = await getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('Video dosyası okunamadı.');
  }

  return dest;
}

/** Kuyruk / arka plan gönderimi için videoyu kalıcı dizine kopyalar. */
export async function persistVideoForQueue(uri: string): Promise<string> {
  const stable = await prepareLocalVideoUri(uri, { forceCopy: true });
  const dest = `${documentDirectory}msg-video-queue-${Date.now()}${extFromUri(stable)}`;
  await copyAsync({ from: stable, to: dest });
  return dest;
}
