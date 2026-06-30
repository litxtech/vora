import * as VideoThumbnails from 'expo-video-thumbnails';

export async function captureThumbnail(uri: string, timeSec: number): Promise<string | null> {
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: Math.round(timeSec * 1000),
      quality: 0.85,
    });
    return thumbUri;
  } catch (err) {
    if (__DEV__) {
      console.warn('[vora-studio] Thumbnail oluşturulamadı:', err);
    }
    return null;
  }
}
