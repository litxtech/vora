import { cacheDirectory, copyAsync, documentDirectory, getInfoAsync } from 'expo-file-system/legacy';

function extFromUri(uri: string): string {
  const match = uri.match(/\.(mp4|mov|m4v)(\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : '.mp4';
}

/** Image picker / galeri URI'sini okunabilir file:// yoluna çevirir. */
export async function prepareLocalVideoUri(uri: string): Promise<string> {
  if (!uri) throw new Error('Video dosyası bulunamadı.');

  if (uri.startsWith('file://')) {
    const info = await getInfoAsync(uri);
    if (info.exists) return uri;
  }

  const dest = `${cacheDirectory}msg-video-${Date.now()}${extFromUri(uri)}`;
  await copyAsync({ from: uri, to: dest });

  const copied = await getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('Video dosyası okunamadı.');
  }

  return dest;
}

/** Kuyruk / arka plan gönderimi için videoyu kalıcı dizine kopyalar. */
export async function persistVideoForQueue(uri: string): Promise<string> {
  const stable = await prepareLocalVideoUri(uri);
  const dest = `${documentDirectory}msg-video-queue-${Date.now()}${extFromUri(stable)}`;
  await copyAsync({ from: stable, to: dest });
  return dest;
}
